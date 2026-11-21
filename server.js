// Shinobi Showdown server: static files + online rooms over WebSocket (/ws).
// The battle engine is deterministic from (specs, seed), so the server only relays:
// it picks the seed, collects both sides' orders each turn, and sends the same
// orders to both players, who each resolve the turn locally.
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { validateTeam } from './public/engine/battle.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.gif': 'image/gif', '.jpeg': 'image/jpeg',
};

const server = http.createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/healthz') { res.writeHead(200).end('ok'); return; }
    // list the images in public/img so the client can swap in custom animation sprites
    if (path === '/img/index.json') {
      const files = (await readdir(join(root, 'img'), { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }).end(JSON.stringify(files));
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});

// ---------------------------------------------------------------- rooms
const rooms = new Map(); // code -> room
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL = 30 * 60 * 1000; // a room with nobody connected is dropped after 30 min

function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}
const token = () => randomBytes(12).toString('hex');
const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const cleanName = (n, side) => String(n || '').replace(/[<>]/g, '').trim().slice(0, 20) || `Player ${side + 1}`;

function newRoom() {
  return {
    code: newCode(),
    players: [null, null], // { token, name, ws }
    specs: [null, null],
    battle: null,          // { seed, history: [[a0, a1], ...], orders: [null, null], wantPreview: [false, false] }
    rematch: [false, false],
    idleSince: Date.now(),
  };
}
const names = (r) => r.players.map((p, i) => (p ? p.name : `Player ${i + 1}`));
const both = (r, msg) => r.players.forEach((p) => send(p?.ws, msg));
const other = (r, side) => r.players[1 - side];

function roomState(r, side) {
  return {
    t: 'room', code: r.code, side, token: r.players[side].token, names: names(r),
    connected: r.players.map((p) => !!p?.ws), ready: r.specs.map(Boolean),
  };
}
function peerUpdate(r) { r.players.forEach((p, i) => p && send(p.ws, { t: 'peer', names: names(r), connected: r.players.map((q) => !!q?.ws), ready: r.specs.map(Boolean) })); }

function startBattle(r) {
  r.battle = { seed: Math.floor(Math.random() * 0x7fffffff), history: [], orders: [null, null], wantPreview: [false, false] };
  r.rematch = [false, false];
  r.specs.forEach((s, i) => { s.name = names(r)[i]; });
  both(r, { t: 'start', specs: r.specs, seed: r.battle.seed, names: names(r) });
}

function sendPreview(r, side) {
  const b = r.battle;
  const theirs = b.orders[1 - side];
  if (!b.wantPreview[side] || !theirs || !theirs.length) return;
  b.wantPreview[side] = false;
  send(r.players[side]?.ws, { t: 'preview', turn: b.history.length, action: theirs[Math.floor(Math.random() * theirs.length)] });
}

function onMessage(ws, msg) {
  const r = ws.room;
  const side = ws.side;
  switch (msg.t) {
    case 'create': {
      leave(ws);
      const room = newRoom();
      rooms.set(room.code, room);
      room.players[0] = { token: token(), name: cleanName(msg.name, 0), ws };
      ws.room = room; ws.side = 0;
      send(ws, roomState(room, 0));
      return;
    }
    case 'join': {
      const room = rooms.get(String(msg.code || '').toUpperCase().trim());
      if (!room) { send(ws, { t: 'error', msg: 'No room with that code.' }); return; }
      const free = room.players.findIndex((p) => !p);
      if (free < 0) { send(ws, { t: 'error', msg: 'That room is full.' }); return; }
      leave(ws);
      room.players[free] = { token: token(), name: cleanName(msg.name, free), ws };
      ws.room = room; ws.side = free;
      send(ws, roomState(room, free));
      peerUpdate(room);
      return;
    }
    case 'rejoin': {
      const room = rooms.get(String(msg.code || '').toUpperCase());
      const s = room ? room.players.findIndex((p) => p && p.token === msg.token) : -1;
      if (s < 0) { send(ws, { t: 'gone' }); return; }
      leave(ws);
      const p = room.players[s];
      if (p.ws && p.ws !== ws) { p.ws.room = null; p.ws.close(); }
      p.ws = ws; ws.room = room; ws.side = s;
      send(ws, roomState(room, s));
      if (room.battle) {
        const b = room.battle;
        send(ws, { t: 'sync', specs: room.specs, seed: b.seed, names: names(room), history: b.history, submitted: !!b.orders[s] });
        if (b.wantPreview[s]) sendPreview(room, s);
      }
      peerUpdate(room);
      return;
    }
    default: break;
  }
  if (!r) return;
  const b = r.battle;
  switch (msg.t) {
    case 'name': {
      r.players[side].name = cleanName(msg.name, side);
      peerUpdate(r);
      return;
    }
    case 'team': {
      if (b || !msg.spec || !Array.isArray(msg.spec.members)) return;
      let errs;
      try { errs = validateTeam(msg.spec); } catch { errs = ['Invalid team.']; }
      if (errs.length) { send(ws, { t: 'error', msg: errs[0] }); return; }
      const members = msg.spec.members.map((m) => ({ id: m.id, loadout: [...(m.loadout || [])], substitution: m.substitution }));
      if (msg.name) r.players[side].name = cleanName(msg.name, side);
      r.specs[side] = { name: names(r)[side], members };
      peerUpdate(r);
      if (r.specs[0] && r.specs[1] && r.players[0] && r.players[1]) startBattle(r);
      return;
    }
    case 'unready': {
      if (b) return;
      r.specs[side] = null;
      peerUpdate(r);
      return;
    }
    case 'orders': {
      if (!b || msg.turn !== b.history.length || b.orders[side] || !Array.isArray(msg.actions)) return;
      b.orders[side] = msg.actions;
      send(other(r, side)?.ws, { t: 'opponentReady' });
      sendPreview(r, 1 - side);
      if (b.orders[0] && b.orders[1]) {
        const pair = [b.orders[0], b.orders[1]];
        b.history.push(pair);
        b.orders = [null, null];
        b.wantPreview = [false, false];
        both(r, { t: 'resolve', turn: b.history.length - 1, actions: pair });
      }
      return;
    }
    case 'wantPreview': {
      if (!b || msg.turn !== b.history.length) return;
      b.wantPreview[side] = true;
      sendPreview(r, side);
      return;
    }
    case 'over': {
      // a client reports the battle ended; the room waits for rematch / new teams
      if (b) b.over = true;
      return;
    }
    case 'rematch': {
      if (!b || !b.over) return;
      r.rematch[side] = true;
      send(other(r, side)?.ws, { t: 'rematchAsk' });
      if (r.rematch[0] && r.rematch[1]) startBattle(r);
      return;
    }
    case 'newTeams': {
      if (b && !b.over) return;
      r.battle = null;
      r.specs = [null, null];
      r.rematch = [false, false];
      both(r, { t: 'rebuild', names: names(r) });
      peerUpdate(r);
      return;
    }
    case 'chat': {
      const text = String(msg.text || '').slice(0, 200).trim();
      if (text) both(r, { t: 'chat', side, text });
      return;
    }
    case 'leave': {
      leave(ws, true);
      return;
    }
    default:
  }
}

function leave(ws, forfeit = false) {
  const r = ws.room;
  if (!r) return;
  const p = r.players[ws.side];
  ws.room = null;
  if (p && p.ws === ws) {
    if (forfeit) {
      r.players[ws.side] = null;
      r.specs = [null, null];
      r.battle = null;
      const o = r.players[1 - ws.side];
      if (o) send(o.ws, { t: 'left', names: names(r) });
      if (!r.players[0] && !r.players[1]) rooms.delete(r.code);
    } else {
      p.ws = null;
      send(other(r, ws.side)?.ws, { t: 'peer', names: names(r), connected: r.players.map((q) => !!q?.ws), ready: r.specs.map(Boolean) });
    }
  }
  if (r.players.every((q) => !q || !q.ws)) r.idleSince = Date.now();
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg && typeof msg.t === 'string') {
      try { onMessage(ws, msg); } catch (e) { console.error('ws message error', e); }
    }
  });
  ws.on('close', () => leave(ws));
});

// keep connections alive through proxies, drop dead sockets and abandoned rooms
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
  const now = Date.now();
  for (const [code, r] of rooms) if (r.players.every((p) => !p || !p.ws) && now - r.idleSince > ROOM_TTL) rooms.delete(code);
}, 25000).unref();

server.listen(PORT, '0.0.0.0', () => console.log(`Shinobi Showdown listening on 0.0.0.0:${PORT}`));
