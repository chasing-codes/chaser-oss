# Changelog

All notable changes to Chaser OSS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Shuffle.com support
- Custom webhook notifications
- Export activity logs
- Multi-account management

## [0.1.0] - 2025-01-02

### Initial Release

#### Features
- Automatic bonus code claiming via event stream
- Manual bonus code input and claiming
- Intelligent reload polling and scheduling
- Cloudflare Turnstile CAPTCHA integration
- Multi-currency support (BTC, ETH, LTC, DOGE, BCH, USDT, USDC, USD)
- Real-time activity logging (max 200 entries)
- Toast notifications for all actions
- Premium dark theme UI with gradient styling
- Configurable settings (auto-claim toggles, intervals, thresholds)
- Connection status monitoring

#### Security
- Two-stage Turnstile injection with world isolation
- Header sanitization for GraphQL requests
- Session cookie authentication (no token storage)
- Content Security Policy handling
- Message validation and type checking
- No credential storage

#### Technical
- Chrome Extension Manifest V3
- Vanilla JavaScript (zero dependencies)
- Server-Sent Events (SSE) for bonus distribution
- GraphQL API integration with Stake.com
- Chrome Storage API for settings persistence
- Background service worker architecture

### Known Issues
- None reported

### Breaking Changes
- N/A (initial release)

---

## Release Notes Format

When creating new releases, use this format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```

[Unreleased]: https://github.com/chasing-codes/chaser-oss/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/chasing-codes/chaser-oss/releases/tag/v0.1.0
