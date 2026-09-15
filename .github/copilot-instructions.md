# Copilot Instructions — BTC Transaction Solidity Helper

## What this project is

A Solidity library (`@rsksmart/btc-transaction-solidity-helper`) that lets smart
contracts on Rootstock work with raw Bitcoin transactions: parsing outputs,
hashing transactions, validating output scripts, and generating/validating
Bitcoin addresses. It is published to npm as a library — the `contracts/`
folder is the package; there is no deployable app.

## Layout

- `contracts/BtcUtils.sol` — the main library; all public helper functions live here.
- `contracts/OpCodes.sol` — Bitcoin script opcode constants used by `BtcUtils`.
- `test/BtcUtils.ts` — TypeScript test suite (Hardhat + chai).
- `test/test-data/` — fixture data for the tests.

## Toolchain

- **Hardhat** (TypeScript config in `hardhat.config.ts`), Solidity **0.8.18**.
- Lint via **solhint** (`@nomiclabs/hardhat-solhint`), config in `.solhint.json`.
- `pre-commit` hooks run lint + tests on staged Solidity/TS files; also gitleaks
  and shellcheck. The `prepare` script bootstraps them on `npm install`
  (`pip3 install pre-commit && pre-commit install`), so **Python/pip3 is required**
  for the contributor setup.

### Commands

- `npm run compile` — compile contracts.
- `npm test` — run the Hardhat test suite (with gas reporting).
- `npm run test:coverage` — coverage report.
- `npm run lint` — solhint check (`npx hardhat check`).

## Conventions

- Target compiler `^0.8.18`; keep the `// SPDX-License-Identifier: MIT` header
  used by the source files. (Note: `package.json` declares `ISC` — the repo is
  internally inconsistent; follow the existing SPDX headers in the contracts.)
- Max line length **120** (enforced by solhint).
- Document public functions with NatSpec (`@notice`, `@param`, `@return`), matching
  the existing style in `BtcUtils.sol`.
- Inline assembly is allowed and used in this codebase for byte manipulation —
  keep it well-commented and reference the Bitcoin spec section it implements.
- Declare magic numbers as named `private constant`s (see the byte-size and
  network-byte constants at the top of `BtcUtils.sol`).
- `var-name-mixedcase` is off and `func-visibility` is a warning (constructors
  ignored), but `no-unused-vars` is an **error** — keep code clean.

## When changing the library

- Add or update a test in `test/BtcUtils.ts` for any behavior change, with
  fixtures under `test/test-data/` where applicable.
- Anchor parsing logic to the Bitcoin raw-transaction format documented in the
  README and the [Bitcoin developer reference](https://developer.bitcoin.org/reference/transactions.html#raw-transaction-format).
- Account for both mainnet and testnet network bytes where address logic is involved.
- The library exposes a `version()` function that returns a hardcoded string —
  keep it in sync with `package.json` when bumping the package version (they have
  drifted before).
- Run `npm run lint && npm test` before considering a change complete.
