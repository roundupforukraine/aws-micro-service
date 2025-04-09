# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-04-09

### Added
- Codecov integration for test coverage reporting
- GitHub Actions workflow for automated testing and coverage reporting
- Test coverage badge in README
- Improved test scripts with coverage reporting

### Changed
- Updated test script to use `--forceExit` to ensure proper cleanup
- Enhanced documentation with badges for project status

### Fixed
- Fixed duplicate manual mock warning in test setup

## [1.0.0] - 2024-03-15

### Added
- Initial release of the Ukraine Round-Up API Service
- Organization registration and management
- Transaction logging and reporting
- API key authentication
- Comprehensive test suite with 86 tests

### Added
- Admin endpoint to delete organizations by ID
- Admin endpoint to delete transactions by ID
- OpenAPI documentation for new delete endpoints
- Integration tests for delete endpoints

### Fixed
- Organization deletion now properly handles related transactions

### Added
- Initial release of the Ukraine Round-Up API
- Organization management with admin and regular organization types
- Transaction processing with round-up calculations
- Authentication using API keys
- Admin-only endpoints for organization registration and management
- Transaction reporting and pagination
- OpenAPI documentation
- Integration and unit tests
- Prisma ORM integration with PostgreSQL
- AWS SDK integration for future cloud services
- Error handling middleware
- Input validation using express-validator
- Logging with Winston
- CORS and security headers with Helmet
- TypeScript support
- Jest testing framework
- Development tools (ESLint, Prettier)
- CI/CD setup
- API client generation scripts 