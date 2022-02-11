// TODO

math
const CALL = () => globalState => {
  [
    gas,
    addr,
    value,
    argsOffset,
    argsLength,
    retOffset,
    retLength
  ] = globalState.callState.stack.slice(0, 7);

  let account = getAccount(addr);
  let callState = {
    ...callState(),
    code: account.code, //load destination Address
    caller: globalState.env.address, //
    callData: new Buffer(
      globalState.callState.memory.slice(argsOffset, argsOffset + argsLength)
    ), //load callData
    callValue: value, //load Call value
    depth: globalState.callState.depth + 1 //Increase depth
  };

  let env = {
    ...env(),
    address: addr,
    contract: account
  };
  state = {
    ...globalState,
    callState,
    env
  };
  let ret = execute(state);
  const stack = [...globalState.callState.stack.slice(7)];
  const mem = globalState.callState.memory;
  const memory = [
    ...mem.slice(0, retOffset),
    ...ret.env.returnValue,
    ...mem.slice(retOffset + retLength)
  ];

  const accounts = ret.callState.halt
    ? { ...globalState.accounts }
    : { ...ret.accounts };

  return {
    ...globalState,
    callState: {
      ...callState,
      stack: stack.concat(new BN(ret.callState.halt ? 0 : 1)),
      pc: globalState.callState.pc + 2,
      memory
    },
    env: {
      ...globalState.env,
      returnValue: ret.env.returnValue
    },
    accounts
  };
};

const RETURNOP = () => globalState => {
  [offset, length] = globalState.callState.stack.slice(0, 2);
  word = globalState.callState.memory.slice(offset, offseta + length);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: globalState.callState.stack.slice(2)
    },
    env: {
      ...globalState.callState.evn,
      returnValue: word
    }
  };
};

//ARITHMETIC
const ADD = (a, b) => a.add(b).mod(uint256);
const MUL = (a, b) => a.mul(b).mod(uint256);
const SUB = (a, b) => a.sub(b).mod(uint256);
const DIV = (a, b) => (b.isZero() ? new BN(b) : a.div(b));

const SDIV = (a, b) =>
  b.isZero()
    ? new BN(b)
    : a
        .fromTwos(256)
        .div(b.fromTwos(256))
        .toTwos(256);

const MOD = (a, b) => a.mod(b);
const SMOD = (a, b) => {
  if (b.isZero()) {
    r = new BN(b);
  } else {
    a = a.fromTwos(256);
    b = b.fromTwos(256);
    r = a.abs().mod(b.abs());
    if (a.isNeg()) {
      r = r.ineg();
    }
    r = r.toTwos(256);
  }
  return r;
};

const ADDMOD = (a, b, c) => a.add(b.mod(c));
const MULMOD = (a, b, c) => a.mul(b.mod(c));

const EXP = (a, b) => a.pow(b).mod(uint256); //NOTE EXP cost dynamic gas, That's no dealt with yet
const SIGNEXTEND = (k, val) => {
  val = val.toArrayLike(Buffer, "be", 32);
  var extendOnes = false;

  if (k.lten(31)) {
    k = k.toNumber();

    if (val[31 - k] & 0x80) {
      extendOnes = true;
    }

    // 31-k-1 since k-th byte shouldn't be modified
    for (var i = 30 - k; i >= 0; i--) {
      val[i] = extendOnes ? 0xff : 0;
    }
  }

  return new BN(val);
};

// COMPARISSON
const LT = (a, b) => new BN(a < b ? 1 : 0);
const GT = (a, b) => new BN(a > b ? 1 : 0);
const SLT = (a, b) => new BN(a.fromTwos(256).lt(b.fromTwos(256)) ? 1 : 0);
const SGT = (a, b) => new BN(a.fromTwos(256).gt(b.fromTwos(256)) ? 1 : 0);
const EQ = (a, b) => new BN(a == b ? 1 : 0);
const ISZERO = a => new BN(a == 0 ? 1 : 0);

//BIT
const AND = (a, b) => a.and(b);
const OR = (a, b) => a.or(b);
const XOR = (a, b) => a.xor(b);
const NOT = a => a.notn(256);
const BYTE = (a, b) =>
  new BN(a.gten(32) ? 0 : b.shrn((31 - a.toNumber()) * 8).andln(0xff));

/**
  HELPERS
**/

const getOp = (call, pc = call.pc) => {
  if (call.pc > call.code.length) {
    return "";
  }
  return parseInt(call.code[pc] + call.code[pc + 1], 16);
};

//Read `item` form globalState and add it to the stack
const stateToStack = path => globalState => {
  const item = path.reduce((state, key) => {
    return state[key];
  }, globalState);

  return {
    ...globalState,
    callState: {
      ...callState,
      pc: globalState.callState.pc + 2,
      stack: [...globalState.callState.stack, item]
    }
  };
};

const stackOp1 = op => globalState => {
  const a = globalState.callState.stack.slice(0, 1);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(1), op(a)],
      pc: callState.pc + 2
    }
  };
};

const stackOp2 = op => globalState => {
  const [a, b] = globalState.callState.stack.slice(0, 2);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(2), op(a, b)],
      pc: callState.pc + 2
    }
  };
};

const stackOp3 = op => globalState => {
  const [a, b, c] = globalState.callState.stack.slice(0, 3);
  return {
    ...globalState,
    callState: {
      ...callState,
      stack: [...callState.stack.slice(3), op(a, b, c)],
      pc: callState.pc + 2
    }
  };
};

// A helper function to raise an exception state
const errorState = () => globalState => {
  return { ...globalState, callState: { ...callState, halt: true } };
};

const toBuffer = value => {
  return value.toArray("be", 32);
};

const getAccount = globalState => (address = globalState.env.address) => {
  return globalState.accounts[address];
};

const putAccount = globalState => account => {
  const newState = { ...globalState };
  newState.accounts[globalState.address.to] = account;
  return newState;
};
