# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Discord.js bot project for nickname management with the following key features:
- Slash command `/name` for nickname setting
- Modal popup for user input (real name and student ID/generation)
- Automatic role detection (current member vs alumni)
- Input validation based on user role
- Nickname formatting and management

## Code Guidelines
- Use modern ES6+ JavaScript features
- Follow Discord.js v14 best practices
- Implement proper error handling for all Discord interactions
- Use ephemeral responses for user privacy
- Validate all user inputs according to specified rules
- Handle permissions and role checking carefully

## Discord.js Specific Notes
- Use `Client` class with proper intents
- Implement slash commands with `SlashCommandBuilder`
- Use modals for complex user input
- Handle interaction responses properly (initial response vs followUp)
- Check user permissions before nickname changes
