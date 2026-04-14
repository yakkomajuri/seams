# seams (beta)

`seams` is a beautiful rich Markdown editor that's triggered via CLI and runs on-demand for the directory you choose.

For example, if you run:

```bash
seams .
```

`seams` will start a server running on port `4444` and open a web browser with a rich Markdown editor so you can edit the files in the current directory.

![seams-gif.gif](/assets/seams-gif.gif)

## Installation

```bash
npm install -g seams-cli
```

## Why

I write a lot of Markdown. Blogs, websites, documentation.

Markdown comes very naturally to me, but editing Markdown in an IDE comes with a few downsides that easily break your writing flow.

For one, editing Markdown in an IDE means you have a ton of other files lying around that are irrelevant to you. Then there are little annoyances like dealing with images, tables, details tags and so on.

`seams` let's you focus on writing and have all the nice things you'd need from something like Obsidian directly in any directory of your choice. One command and you get a fully-featured editor in any directory.

## Features

**On-demand**

Run `seams .` when you need it and get an editor in a second.

**Image uploads**

`/image` and you can select an image from your device and it will be placed in your designated assets subdirectory.

**Table support**

No need to deal with Markdown syntax for tables anymore. `/table` and you're done.

**Details blocks**

A lot of Markdown parsers support HTML `<details>` tags for collapsible content.

Seams supports this and gives you the interactive collapsible section in the UI.

**Strip away the fluff**

By default `seams` will hide all directories that don't contain `.txt`, `.md`, and `.mdx` files so you can easily navigate only the documentation or your blog posts.

**Command bar**

Easily switch between files and search content only within your text/Markdown files.

**Code blocks**

`seams` gives syntax highlighted code blocks with a language picker.

**Seamlessly switch between rich and raw**

Edit in Rich or Raw mode according to your preference.

**Smart links**

Easily link between files in the same directory.

**Block editing**

Drag and drop blocks of text and convert between styles.

## Usage

```bash
Usage:
  $ seams [dir]

Commands:
  [dir]  Open a directory in seams

For more info, run any command with the `--help` flag:
  $ seams --help

Options:
  --port <port>    Port number
  --no-open        Do not open browser
  -v, --version    Display version number
  -h, --help       Display this message
```

### Configuration

`seams` configuration happens per-directory. Once you open the `seams` editor you can click on the gear icon on the sider to get to the Settings page where you can configure things like theme and assets directory.

Changing any value here will create a `.seamsrc` file in your directory that `seams` will read from going forward.

Here's what a `.seamsrc` config file looks like:

```json
{
  "depth": 5,
  "defaultPort": 4444,
  "assets": "./assets",
  "autoSave": true,
  "autoSaveDelay": 250,
  "hideDirsWithoutMd": true,
  "theme": "neutral-dark",
  "ignoreDirs": [
    "node_modules"
  ],
  "ignoreFiles": [
    "drafts/todo.txt"
  ],
  "linkRoot": "/blog"
}
```

**Config options list**

| Option              | Type                                | Default            | Description                                                                             |
| ------------------- | ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `depth`             | `number`                            | `5`                | Maximum directory depth to scan when building the file tree.                            |
| `defaultPort`       | `number`                            | `4444`             | Port for the local server. Increments automatically if the port is already in use.      |
| `assets`            | `string`                            | `"./assets"`       | Relative path to the directory where uploaded images and files are stored.              |
| `autoSave`          | `boolean`                           | `true`             | Automatically save changes to disk after a short delay.                                 |
| `autoSaveDelay`     | `number` (ms)                       | `1000`             | Milliseconds to wait after the last edit before auto-saving. Requires `autoSave: true`. |
| `hideDirsWithoutMd` | `boolean`                           | `true`             | Hide directories with no Markdown files from the sidebar file tree.                     |
| `theme`             | `"neutral-dark" \| "neutral-light"` | `"neutral-dark"`   | Editor UI color theme.                                                                  |
| `ignoreDirs`        | `string[]`                          | `["node_modules"]` | Directories to exclude from the file tree, search, and file watching.                   |
| `ignoreFiles`       | `string[]`                          | `[]`               | Files to exclude from the file tree, search, and file watching.                         |
| `linkRoot`          | `string`                            | —                  | Root path prefix used when generating links between files.                              |

## MDX support

`seams` supports MDX in the sense that it can open MDX files but not render the components (as those are platform-dependent). In that case we create an "MDX block" that is basically a code block so you can edit MDX components raw inside `seams`.

## License

MIT
