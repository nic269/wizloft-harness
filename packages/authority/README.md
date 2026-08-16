# @wizloft/harness-authority

First-party `authority@1` capability contract and default runtime-scoped service.

- contributors register explicitly with the service;
- higher numeric precedence is stronger;
- results separate highest-precedence `contenders` from lower-precedence `shadowed` candidates;
- multiple contenders resolve only through explicit contributor-supplied `resolutionKey` identity;
- authority core never compares prose or derives semantic identity from file content.

The default runtime plugin id is `@wizloft/authority`.
