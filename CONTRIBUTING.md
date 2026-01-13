# Contributing to ClickUp Timesheet Analytics Dashboard

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

1. Install dependencies: `npm install`
2. Set up environment variables (see `.env.example`)
3. Run database migrations: `npx prisma migrate dev`
4. Start the dev server: `npm run dev`

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

## Testing

Before submitting a PR:
- Test all affected features manually
- Ensure the app builds without errors: `npm run build`
- Check for TypeScript errors: `npx tsc --noEmit`
- Run the linter: `npm run lint`

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Keep PRs focused on a single feature/fix
- Update documentation if needed

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, etc.)

## Questions?

Feel free to open an issue for any questions or discussions.

