// Safe arithmetic evaluator (recursive descent) — never uses eval/Function.
const FNS = { sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, round: Math.round, floor: Math.floor, ceil: Math.ceil };
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|\*\*|[-+*/%^()×÷,])/giy;
  const out = [];
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    const start = re.lastIndex;
    m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(start))) break;
      throw new Error(`Unexpected "${src.slice(start).trim()[0]}"`);
    }
    let t = m[1].toLowerCase();
    if (t === '×') t = '*';
    if (t === '÷') t = '/';
    if (t === '**') t = '^';
    out.push(t);
  }
  return out;
}

export function evaluate(src) {
  const toks = tokenize(String(src));
  if (!toks.length) throw new Error('Empty expression');
  let i = 0;
  const peek = () => toks[i];
  const take = (t) => { if (toks[i] !== t) throw new Error(`Expected "${t}"`); i++; };

  // expr := term (('+'|'-') term)*
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = toks[i++] === '+' ? v + term() : v - term();
    return v;
  }
  // term := unary (('*'|'/'|'%') unary)*
  function term() {
    let v = unary();
    while (['*', '/', '%'].includes(peek())) {
      const op = toks[i++], r = unary();
      if ((op === '/' || op === '%') && r === 0) throw new Error('Division by zero');
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function unary() {
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    return power();
  }
  // power is right-associative and binds tighter than unary minus on its left: -2^2 = -4
  function power() {
    const b = atom();
    if (peek() === '^') { i++; return b ** unary(); }
    return b;
  }
  function atom() {
    const t = toks[i++];
    if (t === undefined) throw new Error('Unexpected end');
    if (t === '(') { const v = expr(); take(')'); return v; }
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (t in CONSTS) return CONSTS[t];
    if (t in FNS) { take('('); const v = expr(); take(')'); return FNS[t](v); }
    throw new Error(`Unknown "${t}"`);
  }

  const v = expr();
  if (i < toks.length) throw new Error(`Unexpected "${toks[i]}"`);
  if (!Number.isFinite(v)) throw new Error('Result is not a finite number');
  return v;
}

export function formatNumber(n) {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : String(+n.toPrecision(12));
}
