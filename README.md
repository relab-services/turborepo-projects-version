# Turborepo Projects Version

A GitHub Action that scans Turborepo monorepo repositories and extracts project
information for packages that contain a `build` property in their
`package.json`. This action is useful for CI/CD pipelines that need to identify
and process buildable projects within a monorepo structure.

## Features

- 🔍 **Automatic Discovery**: Scans your Turborepo workspace to find all
  packages
- 📦 **Build-Ready Projects**: Only includes projects with a `build` property in
  package.json
- 🏷️ **Version Extraction**: Extracts name, version, and identifier from each
  project
- 🎯 **Build Grouping**: Groups projects by build type for organized processing
- 📊 **Detailed Logging**: Provides comprehensive logging of discovered projects

## Outputs

| Output     | Description                                                                          |
| ---------- | ------------------------------------------------------------------------------------ |
| `projects` | JSON string containing projects grouped by build type with their version information |

### Output Format

The `projects` output is a JSON object where:

- **Keys**: Build types (from the `build` property in package.json)
- **Values**: Arrays of project information objects

Each project object contains:

- `path`: File system path to the project
- `name`: Package name from package.json
- `version`: Package version from package.json
- `identifier`: Normalized identifier derived from package name
- `build`: Build type(s) associated with the project

#### Example Output

```json
{
  "docker": [
    {
      "path": "./apps/web-app",
      "name": "@myorg/web-app",
      "version": "1.2.3",
      "identifier": "myorg-web-app",
      "build": "docker"
    }
  ],
  "npm": [
    {
      "path": "./packages/shared-lib",
      "name": "@myorg/shared-lib",
      "version": "2.1.0",
      "identifier": "myorg-shared-lib",
      "build": "npm"
    }
  ]
}
```

## Usage

### Basic Usage

Add this action to your workflow to scan your Turborepo monorepo:

```yaml
name: Build Projects
on: [push, pull_request]

jobs:
  scan-projects:
    runs-on: ubuntu-latest
    outputs:
      projects: ${{ steps.scan.outputs.projects }}
steps:
  - name: Checkout
    uses: actions/checkout@v4

      - name: Scan Turborepo Projects
        id: scan
        uses: relab-services/turborepo-projects-version@v1

      - name: Display Projects
        run: echo '${{ steps.scan.outputs.projects }}'
```

### Advanced Usage with Matrix Strategy

Use the output to create dynamic build matrices:

```yaml
name: Build and Deploy
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    outputs:
      projects: ${{ steps.scan.outputs.projects }}
steps:
      - uses: actions/checkout@v4
      - id: scan
        uses: relab-services/turborepo-projects-version@v1

  build-docker:
    needs: scan
    if: contains(fromJSON(needs.scan.outputs.projects), 'docker')
    strategy:
      matrix:
        project: ${{ fromJSON(needs.scan.outputs.projects).docker }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker Image
        run: |
          echo "Building ${{ matrix.project.name }}@${{ matrix.project.version }}"
          echo "Path: ${{ matrix.project.path }}"
          # docker build -t ${{ matrix.project.identifier }}:${{ matrix.project.version }} \
          #   ${{ matrix.project.path }}

  build-npm:
    needs: scan
    if: contains(fromJSON(needs.scan.outputs.projects), 'npm')
    strategy:
      matrix:
        project: ${{ fromJSON(needs.scan.outputs.projects).npm }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build NPM Package
        run: |
          echo "Building ${{ matrix.project.name }}@${{ matrix.project.version }}"
          cd ${{ matrix.project.path }}
          npm ci
          npm run build
```

## Configuration

### Package.json Build Property

For a project to be included in the scan results, it must have a `build`
property in its `package.json`. This property can be:

#### Single Build Type

```json
{
  "name": "@myorg/web-app",
  "version": "1.0.0",
  "build": "docker"
}
```

#### Multiple Build Types

```json
{
  "name": "@myorg/shared-lib",
  "version": "2.1.0",
  "build": ["npm", "docker"]
}
```

### Supported Build Types

The action supports any build type you define. Common examples include:

- `docker` - For containerized applications
- `npm` - For npm packages
- `static` - For static sites
- `serverless` - For serverless functions
- `mobile` - For mobile applications

### Project Structure Example

```text
my-monorepo/
├── turbo.json
├── package.json (with turbo dependency)
├── apps/
│   ├── web-app/
│   │   └── package.json (build: "docker")
│   └── mobile-app/
│       └── package.json (build: "mobile")
└── packages/
    ├── ui-components/
    │   └── package.json (build: "npm")
    └── shared-utils/
        └── package.json (build: ["npm", "docker"])
```

## Requirements

- **Turborepo**: Your repository must have Turborepo installed and configured
- **Node.js**: The action runs on Node.js 24.x
- **Package.json**: Projects must have a `build` property to be included in
  results

## How It Works

1. **Detection**: Scans the root `package.json` to find the Turborepo version
1. **Discovery**: Uses `turbo ls --output=json` to discover all packages in the
   workspace
1. **Analysis**: Reads each package's `package.json` to extract project
   information
1. **Filtering**: Only includes projects that have a `build` property
1. **Grouping**: Groups projects by their build type(s)
1. **Output**: Returns structured JSON with all discovered projects

## Troubleshooting

### Common Issues

#### Action fails with "Repository does not have Turborepo installed"

- Ensure `turbo` is listed in your root `package.json` dependencies or
  devDependencies
- Verify your Turborepo configuration is valid

#### No projects found in output

- Check that your packages have a `build` property in their `package.json`
- Verify that Turborepo can discover your packages with `turbo ls`

#### Projects missing from results

- Ensure the project's `package.json` exists and is valid JSON
- Confirm the `build` property is present and not empty

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm run all` to format, lint, test, and build
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
