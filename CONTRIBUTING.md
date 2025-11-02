# Contributing to Chaser OSS

Thank you for your interest in contributing to Chaser OSS. This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and constructive in all interactions
- Focus on technical merit and factual accuracy
- Provide helpful feedback and accept criticism gracefully
- Prioritize user security and privacy in all contributions

### Unacceptable Behavior

- Obfuscating or minifying code
- Introducing security vulnerabilities intentionally
- Harassment or discriminatory behavior
- Sharing false or misleading information

## How to Contribute

### Reporting Bugs

Before creating a bug report, please:

1. Check existing issues to avoid duplicates
2. Verify the bug exists in the latest version
3. Test with a clean browser profile

Include in your bug report:
- Extension version
- Chrome version and OS
- Steps to reproduce
- Expected vs actual behavior
- Console logs (if applicable)
- Screenshots (if relevant)

### Suggesting Features

Feature suggestions are welcome. Please:

1. Check if the feature has already been suggested
2. Explain the use case and benefits
3. Consider security and privacy implications
4. Describe the expected behavior

### Pull Requests

#### Before You Start

1. Check existing pull requests to avoid duplicate work
2. For major changes, open an issue first to discuss
3. Ensure your changes align with project goals

#### Development Process

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following the coding standards
4. Test thoroughly in a clean Chrome profile
5. Update documentation if needed
6. Commit with clear, descriptive messages
7. Push to your fork
8. Open a pull request

#### Pull Request Guidelines

**Title Format:**
```
[Type] Brief description

Types: Feature, Fix, Docs, Refactor, Security, Perf
```

**Description Must Include:**
- What changes were made
- Why the changes were necessary
- How to test the changes
- Any breaking changes
- Related issue numbers (if applicable)

**Code Quality Requirements:**
- No obfuscation or minification
- Clear variable and function names
- Comments for complex logic
- Consistent with existing code style
- No unnecessary dependencies
- Security best practices followed

**Testing Requirements:**
- Manually tested on Stake.com
- No console errors
- Settings persist correctly
- UI renders properly
- Handles edge cases (logged out, offline, etc.)

## Coding Standards

### JavaScript Style

**General:**
- Use ES6+ features (const/let, arrow functions, async/await)
- 2 spaces for indentation (no tabs)
- Semicolons required
- Single quotes for strings (unless interpolating)
- Descriptive variable names (no single letters except loop counters)

**Functions:**
```javascript
// Good
async function claimBonus(code, source) {
  try {
    const result = await performClaim(code);
    return result;
  } catch (error) {
    console.error('Failed to claim bonus:', error);
    throw error;
  }
}

// Bad
async function cb(c,s){try{return await pc(c)}catch(e){throw e}}
```

**Classes:**
```javascript
// Good
class TurnstileManager {
  constructor() {
    this.tokens = new Map();
    this.resolvers = new Map();
  }

  async createToken() {
    // Implementation
  }
}

// Bad
class TM{constructor(){this.t=new Map();this.r=new Map();}async ct(){}}
```

**Comments:**
```javascript
// Good: Explain WHY, not WHAT
// Retry with exponential backoff to handle temporary Turnstile API failures
await this.retryWithBackoff(loadTurnstile, retries);

// Bad: Obvious comment
// Increment counter
counter++;

// Bad: No comment for complex logic
const x=(a,b)=>a.reduce((p,c)=>({...p,[c]:b[c]}),{});
```

### File Organization

**content/content.js:**
- Core automation logic
- API integrations
- Token management
- Event stream handling

**content/ui.js:**
- UI components
- DOM manipulation
- Event binding
- User interactions

**background.js:**
- Settings management
- Message routing
- Script injection
- Storage operations

### Commit Messages

Follow conventional commits format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `security`: Security enhancement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add support for custom webhook notifications

Allows users to configure a webhook URL that receives
notifications when bonuses are claimed or reloads are processed.

Closes #42
```

```
fix: Prevent memory leak in Turnstile token cleanup

Token resolvers were not being cleared after timeout,
causing memory to grow unbounded. Added cleanup in
scheduleCleanup method.

Fixes #38
```

```
security: Sanitize user input in custom stream URL

Validate and sanitize custom stream URLs to prevent
potential XSS or injection attacks.
```

## Security

### Reporting Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security details to the maintainers (see README)
2. Include reproduction steps and impact assessment
3. Allow reasonable time for fix before public disclosure

### Security Guidelines for Contributors

**Never:**
- Store sensitive data (tokens, passwords, keys) in logs or storage
- Introduce XSS, injection, or CSRF vulnerabilities
- Bypass security mechanisms (CSP, CORS, etc.)
- Add external dependencies without thorough review
- Obfuscate code or hide functionality

**Always:**
- Validate and sanitize all user inputs
- Use parameterized queries/requests
- Follow principle of least privilege
- Document security implications of changes
- Consider attack vectors and edge cases

**Code Review Checklist:**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user-provided data
- [ ] No eval() or Function() with user input
- [ ] Proper error handling (no sensitive info in errors)
- [ ] HTTPS for all network requests
- [ ] Minimal permissions requested
- [ ] No new host_permissions without justification

## Testing

### Manual Testing Checklist

Before submitting a PR, verify:

**Basic Functionality:**
- [ ] Extension loads without errors
- [ ] UI appears on Stake.com
- [ ] Settings panel opens/closes
- [ ] Manual bonus claiming works
- [ ] Reload status refresh works
- [ ] Activity log updates

**Settings Persistence:**
- [ ] Changes save correctly
- [ ] Settings persist after page reload
- [ ] Settings persist after browser restart
- [ ] Invalid inputs are validated

**Edge Cases:**
- [ ] Works when user is logged out (or shows appropriate error)
- [ ] Handles network offline gracefully
- [ ] Handles event stream disconnection
- [ ] Handles Turnstile failures
- [ ] Handles invalid bonus codes
- [ ] Handles rapid clicking

**Browser Compatibility:**
- [ ] Tested in latest Chrome stable
- [ ] No console errors
- [ ] UI renders correctly
- [ ] Animations work smoothly

### Testing Environment

**Clean Profile Testing:**
1. Create new Chrome profile
2. Install extension
3. Test from fresh state
4. Verify no conflicts

**Network Conditions:**
- Test with normal connection
- Test with slow connection (Chrome DevTools throttling)
- Test with connection drop/restore

## Documentation

### When to Update Documentation

Update documentation when:
- Adding new features
- Changing behavior
- Modifying settings
- Updating dependencies
- Changing architecture

### Documentation Locations

- **README.md**: User-facing documentation
- **CONTRIBUTING.md**: This file
- **CHANGELOG.md**: Version history
- **Code comments**: Complex logic explanation

### Documentation Standards

**Be Clear:**
- Use simple, direct language
- Define technical terms
- Provide examples
- Include code samples

**Be Complete:**
- Cover all parameters
- Document return values
- List possible errors
- Include edge cases

**Be Accurate:**
- Test all examples
- Verify commands work
- Update version numbers
- Fix broken links

## Release Process

Releases are managed by maintainers. Contributors should:

1. Update CHANGELOG.md with changes
2. Ensure manifest.json version is correct
3. Tag commits appropriately
4. Follow semantic versioning

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features (backward compatible)
- **Patch (0.0.X)**: Bug fixes

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues
3. Open a discussion on GitHub
4. Reach out to maintainers

## Recognition

All contributors will be:
- Listed in release notes
- Credited in README (for significant contributions)
- Acknowledged in CHANGELOG.md

## License

By contributing to Chaser OSS, you agree that your contributions will be licensed under the [MIT License](LICENSE), the same license as the project.

---

Thank you for helping make Chaser OSS better and safer for the community!
