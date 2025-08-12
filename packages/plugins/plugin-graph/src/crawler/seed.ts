import { NodeKey } from '../types';
import { guessTableFromId } from './queries';

/**
 * Accept seed as "Table:ID" or a bare ID with a recognizable prefix.
 */
export function parseSeed(input: string): NodeKey | undefined {
  const parts = input.split(':');
  if (parts.length === 2) return { table: parts[0], id: parts[1] };
  const guessed = guessTableFromId(input);
  return guessed ? { table: guessed, id: input } : undefined;
}


