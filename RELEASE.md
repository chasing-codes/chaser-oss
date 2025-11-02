# Release Process

This document describes how to create a new release of Chaser OSS.

## Prerequisites

- Push access to the repository
- Up-to-date local copy of the main branch
- Completed and tested changes for the release

## Release Steps

### 1. Update Version Numbers

Update the version in `manifest.json`:

```json
{
  "version": "X.Y.Z"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **X (Major)**: Breaking changes
- **Y (Minor)**: New features (backward compatible)
- **Z (Patch)**: Bug fixes

### 2. Update CHANGELOG.md

Add a new section for the release:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Change description

### Fixed
- Bug fix description

### Security
- Security improvement description
```

Update the links at the bottom:

```markdown
[Unreleased]: https://github.com/chasing-codes/chaser-oss/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/chasing-codes/chaser-oss/releases/tag/vX.Y.Z
```

### 3. Update README (if needed)

If the version is referenced in installation instructions or examples, update:

```bash
# Find and replace version references
sed -i 's/v0.1.0/vX.Y.Z/g' README.md
```

### 4. Commit Changes

```bash
git add manifest.json CHANGELOG.md README.md
git commit -m "chore: Bump version to X.Y.Z"
git push origin main
```

### 5. Create and Push Tag

```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push tag to trigger release workflow
git push origin vX.Y.Z
```

### 6. Monitor Release Workflow

1. Go to https://github.com/chasing-codes/chaser-oss/actions

2. Watch the "Create Release" workflow run

3. Verify all steps complete successfully:
   - Checkout code
   - Verify manifest version matches tag
   - Create distribution package
   - Generate checksums
   - Create GitHub Release
   - Upload artifacts

### 7. Verify Release

After the workflow completes:

1. Visit https://github.com/chasing-codes/chaser-oss/releases

2. Verify the new release appears with:
   - Correct version number
   - Release notes
   - `chaser-oss-vX.Y.Z.zip` attachment
   - `chaser-oss-vX.Y.Z.zip.sha256` attachment

3. Download and verify the release:

```bash
# Download both files
curl -LO https://github.com/chasing-codes/chaser-oss/releases/download/vX.Y.Z/chaser-oss-vX.Y.Z.zip
curl -LO https://github.com/chasing-codes/chaser-oss/releases/download/vX.Y.Z/chaser-oss-vX.Y.Z.zip.sha256

# Verify checksum
sha256sum -c chaser-oss-vX.Y.Z.zip.sha256

# Extract and test
unzip chaser-oss-vX.Y.Z.zip -d test-release
# Load unpacked extension in Chrome and test
```

### 8. Announce Release (Optional)

If you have community channels:
- Post announcement with changelog highlights
- Include download link to official release
- Remind users to verify checksums
- Highlight any breaking changes or important updates

## Workflow Details

The release workflow (`.github/workflows/release.yml`) automatically:

1. **Triggers** on any tag matching `v*` pattern
2. **Validates** that manifest.json version matches the tag
3. **Creates** a clean ZIP containing:
   - manifest.json
   - background.js
   - content/ directory
   - assets/ directory
   - README.md
4. **Generates** SHA256 checksum
5. **Creates** GitHub release with:
   - Auto-generated release notes
   - Custom release notes (from CHANGELOG.md if available)
   - Attached ZIP and checksum files
6. **Marks** as prerelease if tag contains 'alpha', 'beta', or 'rc'

## Troubleshooting

### Workflow Fails: Version Mismatch

**Error:** "manifest.json version does not match tag version"

**Solution:**
1. Delete the tag: `git tag -d vX.Y.Z && git push origin :vX.Y.Z`
2. Fix manifest.json version
3. Commit and recreate tag

### Workflow Fails: Permission Denied

**Error:** "Resource not accessible by integration"

**Solution:**
- Ensure repository has "Read and write permissions" for workflows
- Go to Settings → Actions → General → Workflow permissions
- Select "Read and write permissions"

### Release Created as Draft

The workflow creates releases as non-draft by default. If a release is draft:
1. Go to the release page
2. Click "Edit"
3. Uncheck "Save as draft"
4. Click "Publish release"

### Wrong Files in ZIP

If the ZIP contains unwanted files:
1. Update the `zip` command in `.github/workflows/release.yml`
2. Add exclusions with `-x` flag
3. Delete the release and tag
4. Recreate the tag to trigger new build

## Prerelease Versions

For alpha, beta, or release candidate versions:

**Tag Format:**
- `v1.0.0-alpha.1`
- `v1.0.0-beta.2`
- `v1.0.0-rc.1`

The workflow automatically marks these as "prerelease" on GitHub.

## Hotfix Releases

For urgent bug fixes:

1. Create hotfix branch from the tagged release:
```bash
git checkout -b hotfix/vX.Y.Z+1 vX.Y.Z
```

2. Apply fixes and test thoroughly

3. Update version to patch increment (e.g., 1.0.0 → 1.0.1)

4. Update CHANGELOG.md with fix details

5. Commit, tag, and push:
```bash
git commit -am "fix: Critical bug description"
git tag -a vX.Y.Z+1 -m "Hotfix release vX.Y.Z+1"
git push origin hotfix/vX.Y.Z+1
git push origin vX.Y.Z+1
```

6. Merge hotfix back to main:
```bash
git checkout main
git merge hotfix/vX.Y.Z+1
git push origin main
```

## Rollback a Release

If a release has critical issues:

1. **Delete the release** (not just unpublish):
   - Go to release page
   - Click "Delete"

2. **Delete the tag**:
```bash
git tag -d vX.Y.Z
git push origin :vX.Y.Z
```

3. **Communicate** the rollback to users via:
   - GitHub issue/discussion
   - Community channels
   - Updated README if needed

4. **Fix the issues** and create a new release with incremented version

## Checklist Template

Copy this checklist for each release:

```markdown
## Release vX.Y.Z Checklist

- [ ] All changes tested locally
- [ ] manifest.json version updated
- [ ] CHANGELOG.md updated with all changes
- [ ] README.md updated if needed
- [ ] Changes committed and pushed to main
- [ ] Tag created and pushed
- [ ] Workflow completed successfully
- [ ] Release artifacts verified
- [ ] Extension tested from release ZIP
- [ ] Release announcement prepared (if applicable)
```

## Questions?

If you encounter issues not covered here:
1. Check GitHub Actions logs for detailed error messages
2. Review closed issues for similar problems
3. Open a new issue with workflow logs attached
