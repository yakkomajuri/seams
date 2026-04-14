import { type ChangeEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiLink, RiText } from 'react-icons/ri';
import {
  useComponentsContext,
  useExtension,
  type LinkToolbarProps,
  DeleteLinkButton,
  getFormattingToolbarItems,
} from '@blocknote/react';
import {
  LinkToolbarExtension,
  FormattingToolbarExtension,
  ShowSelectionExtension,
  VALID_LINK_PROTOCOLS,
  DEFAULT_LINK_PROTOCOL,
} from '@blocknote/core/extensions';
import {
  formatKeyboardShortcut,
  isTableCellSelection,
  type BlockNoteEditor,
  type BlockSchema,
  type StyleSchema,
} from '@blocknote/core';
import { useBlockNoteEditor } from '@blocknote/react';
import { useEditorState, useDictionary } from '@blocknote/react';
import { useFileStore } from '../stores/fileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { buildPageUrl } from '../lib/pageLinkItems';
import { goToFiles } from '../lib/router';
import type { FileNode } from '../../../src/types';

// ── Helpers ──────────────────────────────────────────────────────────

function collectFiles(nodes: FileNode[]): { path: string; name: string }[] {
  const out: { path: string; name: string }[] = [];
  function visit(entries: FileNode[]) {
    for (const entry of entries) {
      if (entry.type === 'file') {
        const name = (entry.path.split('/').pop() ?? entry.path).replace(/\.(md|mdx|txt)$/, '');
        out.push({ path: entry.path, name });
      } else if (entry.children) {
        visit(entry.children);
      }
    }
  }
  visit(nodes);
  return out;
}

function validateUrl(url: string) {
  for (const protocol of VALID_LINK_PROTOCOLS) {
    if (url.startsWith(protocol)) return url;
  }
  return `${DEFAULT_LINK_PROTOCOL}://${url}`;
}

function isExternalUrl(url: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url);
}

// ── SeamsEditLinkMenuItems ───────────────────────────────────────────

type EditLinkMenuItemsProps = Pick<
  LinkToolbarProps,
  'url' | 'text' | 'range' | 'setToolbarOpen' | 'setToolbarPositionFrozen'
> & {
  showTextField?: boolean;
};

export function SeamsEditLinkMenuItems(props: EditLinkMenuItemsProps) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const { editLink } = useExtension(LinkToolbarExtension);
  const files = useFileStore((s) => s.files);
  const activeFile = useFileStore((s) => s.activeFile);
  const linkRoot = useSettingsStore((s) => s.settings?.linkRoot ?? '');

  const { url, text, showTextField } = props;
  const [currentUrl, setCurrentUrl] = useState<string>(url);
  const [currentText, setCurrentText] = useState<string>(text);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUrl(url);
    setCurrentText(text);
  }, [text, url]);

  // Build page suggestions filtered by query
  const suggestions = useMemo(() => {
    // Don't show suggestions for external URLs
    if (isExternalUrl(currentUrl)) return [];

    const allPages = collectFiles(files).filter((f) => f.path !== activeFile);
    if (!currentUrl) return allPages.slice(0, 8);

    const q = currentUrl.toLowerCase();
    return allPages
      .filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [currentUrl, files, activeFile]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length, currentUrl]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const submit = useCallback(
    (finalUrl: string, finalText: string) => {
      // Don't prepend https:// to page links (starting with /)
      const resolved = finalUrl.startsWith('/') ? finalUrl : validateUrl(finalUrl);
      editLink(resolved, finalText, props.range.from);
      props.setToolbarOpen?.(false);
      props.setToolbarPositionFrozen?.(false);
    },
    [editLink, props],
  );

  const selectPage = useCallback(
    (page: { path: string; name: string }) => {
      const pageUrl = buildPageUrl(page.path, linkRoot);
      submit(pageUrl, currentText || page.name);
    },
    [linkRoot, submit, currentText],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        event.preventDefault();
        setSelectedIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp' && suggestions.length > 0) {
        event.preventDefault();
        setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        if (suggestions.length > 0 && !isExternalUrl(currentUrl)) {
          selectPage(suggestions[selectedIndex]);
        } else {
          submit(currentUrl, currentText);
        }
      }
    },
    [suggestions, selectedIndex, currentUrl, currentText, selectPage, submit],
  );

  const handleUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCurrentUrl(event.currentTarget.value),
    [],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setCurrentText(event.currentTarget.value),
    [],
  );

  const handleSubmit = useCallback(() => {
    submit(currentUrl, currentText);
  }, [currentUrl, currentText, submit]);

  return (
    <Components.Generic.Form.Root>
      <Components.Generic.Form.TextInput
        className="bn-text-input"
        name="url"
        icon={<RiLink />}
        autoFocus={true}
        placeholder={dict.link_toolbar.form.url_placeholder}
        value={currentUrl}
        onKeyDown={handleKeyDown}
        onChange={handleUrlChange}
        onSubmit={handleSubmit}
        autoComplete="off"
      />

      {suggestions.length > 0 && (
        <div className="seams-page-suggestions" ref={listRef}>
          {suggestions.map((page, i) => (
            <button
              key={page.path}
              className="seams-page-suggestion-item"
              data-selected={i === selectedIndex || undefined}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                selectPage(page);
              }}
            >
              <span className="seams-page-suggestion-name">{page.name}</span>
              <span className="seams-page-suggestion-path">{page.path.replace(/^\.\//, '')}</span>
            </button>
          ))}
        </div>
      )}

      {showTextField !== false && (
        <Components.Generic.Form.TextInput
          className="bn-text-input"
          name="title"
          icon={<RiText />}
          placeholder={dict.link_toolbar.form.title_placeholder}
          value={currentText}
          onKeyDown={handleKeyDown}
          onChange={handleTextChange}
          onSubmit={handleSubmit}
        />
      )}
    </Components.Generic.Form.Root>
  );
}

// ── SeamsOpenLinkButton ─────────────────────────────────────────────

function SeamsOpenLinkButton({ url }: { url: string }) {
  const Components = useComponentsContext()!;
  const files = useFileStore((s) => s.files);
  const linkRoot = useSettingsStore((s) => s.settings?.linkRoot ?? '');

  const handleOpen = useCallback(() => {
    if (isExternalUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const allFiles = collectFiles(files);
    const match = allFiles.find((f) => {
      if (buildPageUrl(f.path, linkRoot) === url) return true;
      const noExt = f.path.replace(/\.(md|mdx|txt)$/, '');
      return buildPageUrl(noExt, linkRoot) === url;
    });
    if (match) {
      goToFiles(match.path);
    } else {
      window.location.href = url;
    }
  }, [url, files, linkRoot]);

  return (
    <Components.LinkToolbar.Button
      className="bn-button"
      mainTooltip="Open"
      onClick={handleOpen}
    >
      Open
    </Components.LinkToolbar.Button>
  );
}

// ── SeamsLinkToolbar ────────────────────────────────────────────────

export function SeamsLinkToolbar(props: LinkToolbarProps) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  return (
    <Components.LinkToolbar.Root className="bn-toolbar bn-link-toolbar">
      <Components.Generic.Popover.Root onOpenChange={props.setToolbarPositionFrozen}>
        <Components.Generic.Popover.Trigger>
          <Components.LinkToolbar.Button
            className="bn-button"
            mainTooltip={dict.link_toolbar.edit.tooltip}
            isSelected={false}
          >
            {dict.link_toolbar.edit.text}
          </Components.LinkToolbar.Button>
        </Components.Generic.Popover.Trigger>
        <Components.Generic.Popover.Content
          className="bn-popover-content bn-form-popover"
          variant="form-popover"
        >
          <SeamsEditLinkMenuItems
            url={props.url}
            text={props.text}
            range={props.range}
            setToolbarOpen={props.setToolbarOpen}
            setToolbarPositionFrozen={props.setToolbarPositionFrozen}
          />
        </Components.Generic.Popover.Content>
      </Components.Generic.Popover.Root>
      <SeamsOpenLinkButton url={props.url} />
      <DeleteLinkButton range={props.range} setToolbarOpen={props.setToolbarOpen} />
    </Components.LinkToolbar.Root>
  );
}

// ── SeamsCreateLinkButton ───────────────────────────────────────────

function checkLinkInSchema(
  editor: BlockNoteEditor<BlockSchema, any, StyleSchema>,
): boolean {
  return (
    'link' in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema['link'] === 'link'
  );
}

export function SeamsCreateLinkButton() {
  const editor = useBlockNoteEditor<any, any, any>();
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const formattingToolbar = useExtension(FormattingToolbarExtension);
  const { showSelection } = useExtension(ShowSelectionExtension);

  const [showPopover, setShowPopover] = useState(false);
  useEffect(() => {
    showSelection(showPopover, 'createLinkButton');
    return () => showSelection(false, 'createLinkButton');
  }, [showPopover, showSelection]);

  const state = useEditorState({
    editor,
    selector: ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
      if (
        !editor.isEditable ||
        !checkLinkInSchema(editor) ||
        isTableCellSelection(editor.prosemirrorState.selection) ||
        !(editor.getSelection()?.blocks || [editor.getTextCursorPosition().block]).find(
          (block: any) => block.content !== undefined,
        )
      ) {
        return undefined;
      }
      return {
        url: editor.getSelectedLinkUrl(),
        text: editor.getSelectedText(),
        range: {
          from: editor.prosemirrorState.selection.from,
          to: editor.prosemirrorState.selection.to,
        },
      };
    },
  });

  useEffect(() => {
    setShowPopover(false);
  }, [state]);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        setShowPopover(true);
        event.preventDefault();
      }
    };
    const domElement = editor.domElement;
    domElement?.addEventListener('keydown', callback as any);
    return () => {
      domElement?.removeEventListener('keydown', callback as any);
    };
  }, [editor.domElement]);

  if (state === undefined) return null;

  return (
    <Components.Generic.Popover.Root open={showPopover} onOpenChange={setShowPopover}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          data-test="createLink"
          label={dict.formatting_toolbar.link.tooltip}
          mainTooltip={dict.formatting_toolbar.link.tooltip}
          secondaryTooltip={formatKeyboardShortcut(
            dict.formatting_toolbar.link.secondary_tooltip,
            dict.generic.ctrl_shortcut,
          )}
          icon={<RiLink />}
          onClick={() => setShowPopover((open) => !open)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className="bn-popover-content bn-form-popover"
        variant="form-popover"
      >
        <SeamsEditLinkMenuItems
          url={state.url || ''}
          text={state.text}
          range={state.range}
          showTextField={false}
          setToolbarOpen={(open) => formattingToolbar.store.setState(open)}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
}

// ── SeamsFormattingToolbar ───────────────────────────────────────────

// Non-markdown formatting features to hide from the toolbar
const HIDDEN_TOOLBAR_KEYS = new Set([
  'textAlignLeftButton',
  'textAlignCenterButton',
  'textAlignRightButton',
  'colorStyleButton',
  'underlineStyleButton',
]);

export function SeamsFormattingToolbar(props: { blockTypeSelectItems?: any; children?: ReactNode }) {
  const Components = useComponentsContext()!;
  const items = getFormattingToolbarItems(props.blockTypeSelectItems);

  // Filter out non-markdown features and replace CreateLinkButton with ours
  const customItems = items
    .filter((item) => !HIDDEN_TOOLBAR_KEYS.has(item.key as string))
    .map((item) =>
      item.key === 'createLinkButton'
        ? <SeamsCreateLinkButton key="createLinkButton" />
        : item,
    );

  return (
    <Components.FormattingToolbar.Root className="bn-toolbar bn-formatting-toolbar">
      {props.children || customItems}
    </Components.FormattingToolbar.Root>
  );
}
