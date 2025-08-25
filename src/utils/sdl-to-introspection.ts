import { parse } from 'graphql/language';
import { buildSchema } from 'graphql/utilities';
import { KnownDirectivesRule } from 'graphql/validation';
// eslint-disable-next-line import/no-unresolved
import { specifiedSDLRules } from 'graphql/validation/specifiedRules.ts';
// eslint-disable-next-line import/no-unresolved
import { validateSDL } from 'graphql/validation/validate.ts';

const validationRules = specifiedSDLRules.filter(
  // Many consumes/produces SDL files with custom directives and without defining them.
  // This practice is contradict spec but is very widespread at the same time.
  (rule) => rule !== KnownDirectivesRule,
);

export function sdlToSchema(sdl: string) {
  const documentAST = parse(sdl);
  const errors = validateSDL(documentAST, null, validationRules);
  if (errors.length !== 0) {
    throw new Error(errors.map((error) => error.message).join('\n\n'));
  }

  return buildSchema(sdl, { assumeValidSDL: true });
}
