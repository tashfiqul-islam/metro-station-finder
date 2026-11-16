/**
 * One Autocomplete billing session at a time (ADR-0009 amendment 5). `token()` makes a token when none is open and
 * returns the same one until `end()`; after `end()` the next `token()` makes a new one, so a finished token is
 * never handed out again. `make` is Google's `AutocompleteSessionToken` constructor in the app and a counter in
 * tests; nothing here knows Google.
 */
export interface Session<Token> {
  /** The open session's token, started now when there is none. */
  readonly token: () => Token;
  /**
   * Closes the session: after a selection (`fetchFields`) or an abandoned search. Safe to call when none is open.
   * With `token`, closes only the session that token belongs to: a token that is no longer the open one (its
   * session ended earlier) leaves the newer session alone.
   */
  readonly end: (token?: Token) => void;
}

export function createSession<Token>(make: () => Token): Session<Token> {
  let open: { readonly token: Token } | null = null;
  return {
    token: () => {
      open ??= { token: make() };
      return open.token;
    },
    end: (token) => {
      if (token === undefined || open?.token === token) open = null;
    },
  };
}
