import { AppError } from "./errors";
import { containsLink, findBlockedTerm, looksLikeRepeatSpam } from "./text";

export type ContentRules = {
  allowLinks: boolean;
  blockedTerms: readonly string[];
};

/**
 * Rejects obvious spam before it reaches the moderation queue.
 * Throws a VALIDATION error with a friendly message; the text is already normalised.
 */
export function assertContentAllowed(text: string, rules: ContentRules, field = "body"): void {
  if (!rules.allowLinks && containsLink(text)) {
    throw new AppError("VALIDATION", "Links and e-mail addresses aren't allowed here.", {
      fieldErrors: { [field]: "Remove the link or e-mail address." },
    });
  }
  if (looksLikeRepeatSpam(text)) {
    throw new AppError("VALIDATION", "That looks like spam. Try writing it in your own words.", {
      fieldErrors: { [field]: "Looks like repeated text." },
    });
  }
  const blocked = findBlockedTerm(text, rules.blockedTerms);
  if (blocked) {
    throw new AppError("VALIDATION", "That contains wording we don't allow on Grade Delusion.", {
      // The term itself is not echoed back, so the list can't be probed one word at a time.
      fieldErrors: { [field]: "Contains a blocked word or phrase." },
    });
  }
}
