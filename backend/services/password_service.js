import crypto from "crypto";

const DEFAULT_SCRYPT_PARAMS = {
  n: 32768,
  r: 8,
  p: 1,
  keyLength: 64,
};

export async function generatePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, DEFAULT_SCRYPT_PARAMS);
  return `scrypt:${DEFAULT_SCRYPT_PARAMS.n}:${DEFAULT_SCRYPT_PARAMS.r}:${DEFAULT_SCRYPT_PARAMS.p}$${salt}$${hash.toString("hex")}`;
}

export async function checkPasswordHash(storedHash, password) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  try {
    if (storedHash.startsWith("scrypt:")) {
      return await checkWerkzeugScrypt(storedHash, password);
    }

    if (storedHash.startsWith("pbkdf2:")) {
      return await checkWerkzeugPbkdf2(storedHash, password);
    }
  } catch {
    return false;
  }

  return false;
}

async function checkWerkzeugScrypt(storedHash, password) {
  const [method, salt, expectedHex] = storedHash.split("$");
  const [, n, r, p] = method.split(":");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, {
    n: Number(n),
    r: Number(r),
    p: Number(p),
    keyLength: expected.length,
  });

  return crypto.timingSafeEqual(actual, expected);
}

async function checkWerkzeugPbkdf2(storedHash, password) {
  const [method, salt, expectedHex] = storedHash.split("$");
  const [, digest, iterations] = method.split(":");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterations), expected.length, digest);

  return crypto.timingSafeEqual(actual, expected);
}

function scrypt(password, salt, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      params.keyLength,
      {
        N: params.n,
        r: params.r,
        p: params.p,
        maxmem: 128 * params.n * params.r * 2,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
        } else {
          resolve(derivedKey);
        }
      },
    );
  });
}
