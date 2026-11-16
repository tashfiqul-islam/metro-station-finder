/**
 * One Autocomplete billing session at a time (ADR-0009 amendment 5). `token()` makes a token when none is open and
 * returns the same one until `end()`; after `end()` the next `token()` makes a new one, so a finished token is
 * never handed out again. `make` is Google's `AutocompleteSessionToken` constructor in the app and a counter in
 * tests; nothing here knows Google.
 */
export interface Session<Token> {
  /** The open session's token, started now when there is none. */
  readonly token: () => Token;
  /** Closes the session: after a selection (`fetchFields`) or an abandoned search. Safe to call when none is open. */
  readonly end: () => void;
}

export function createSession<Token>(make: () => Token): Session<Token> {
  let open: { readonly token: Token } | null = null;
  return {
    token: () => {
      open ??= { token: make() };
      return open.token;
    },
    end: () => {
      open = null;
    },
  };
}
