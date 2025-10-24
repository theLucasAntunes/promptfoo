"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFeedback = sendFeedback;
exports.gatherFeedback = gatherFeedback;
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const accounts_1 = require("./globalConfig/accounts");
const logger_1 = __importDefault(require("./logger"));
const index_1 = require("./util/fetch/index");
const readline_1 = require("./util/readline");
/**
 * Send feedback to the promptfoo API
 */
async function sendFeedback(feedback) {
    if (!feedback.trim()) {
        return;
    }
    try {
        const resp = await (0, index_1.fetchWithProxy)('https://api.promptfoo.dev/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: feedback,
            }),
        });
        if (resp.ok) {
            logger_1.default.info(chalk_1.default.green('Feedback sent. Thank you!'));
        }
        else {
            logger_1.default.info(chalk_1.default.yellow('Failed to send feedback. Please try again or open an issue on GitHub.'));
        }
    }
    catch {
        logger_1.default.error('Network error while sending feedback');
    }
}
/**
 * Gather and send user feedback
 */
async function gatherFeedback(message) {
    // If message is provided directly, send it without prompting
    if (message) {
        await sendFeedback(message);
        return;
    }
    try {
        // Get user email if logged in
        const userEmail = (0, accounts_1.getUserEmail)();
        logger_1.default.info(chalk_1.default.blue.bold('\n📝 promptfoo Feedback'));
        logger_1.default.info(chalk_1.default.dim('─'.repeat(40)));
        // Get feedback message
        const feedbackText = await (0, readline_1.promptUser)((0, dedent_1.default) `
      ${chalk_1.default.gray('Share your thoughts, bug reports, or feature requests:')}
      ${chalk_1.default.bold('> ')}
      `);
        if (!feedbackText.trim()) {
            logger_1.default.info(chalk_1.default.yellow('No feedback provided.'));
            return;
        }
        // Get contact info if not logged in
        let finalFeedback = feedbackText;
        let contactInfo = '';
        if (userEmail) {
            contactInfo = userEmail;
        }
        else {
            const contactResponse = await (0, readline_1.promptUser)(chalk_1.default.gray("Email address (optional, if you'd like a response): "));
            contactInfo = contactResponse.trim();
        }
        // Add contact info to feedback if provided
        if (contactInfo) {
            finalFeedback = `${feedbackText}\n\nContact: ${contactInfo}`;
        }
        await sendFeedback(finalFeedback);
    }
    catch {
        logger_1.default.error('Error gathering feedback');
    }
}
//# sourceMappingURL=feedback.js.map