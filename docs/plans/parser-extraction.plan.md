# Plan: `llm-stream-parser` — Standalone LLM Response Parser

## 1. Rationale

The parsing logic in Opilot solves a genuinely portable problem: LLMs emit heterogeneous output (thinking tokens, XML tool calls, JSON-wrapped tool calls, injected context tags, markdown fences) and no existing library cleanly handles all of it across streaming and non-streaming paths without pulling in a full framework. Extracting it creates a reusable primitive other VS Code extension authors and Node.js developers can consume.

---

## 2. Scope: What Extracts vs What Stays

### Extracts into the library

| Module                                                          | Source file       |
| --------------------------------------------------------------- | ----------------- |
| `ThinkingParser` — streaming `<think>` splitter                 | thinkingParser.ts |
| `XmlStreamFilter` — SAX context-tag scrubber                    | formatting.ts     |
| `extractXmlToolCalls` — bare XML + JSON-wrapped format          | toolUtils.ts      |
| `cleanXml` — markdown fence / prose stripping (internal helper) | toolUtils.ts      |
| `buildXmlToolSystemPrompt` — few-shot XML prompt builder        | toolUtils.ts      |
| `splitLeadingXmlContextBlocks` / `dedupeXmlContextBlocksByTag`  | formatting.ts     |
| `sanitizeNonStreamingModelOutput` / `stripXmlContextTags`       | formatting.ts     |
| `formatXmlLikeResponseForDisplay` — XML→markdown formatter      | formatting.ts     |
| `appendToBlockquote` — streaming markdown blockquote helper     | provider.ts       |
| `LLMStreamProcessor` — orchestration class (new)                | —                 |
| Adapters: VS Code, generic async iterable                       | —                 |

### Stays in Opilot

- Ollama-specific retry/rescue ladder (`isThinkingNotSupportedError`, `isThinkingInternalServerError`)
- `isThinkingModelId` / `THINKING_MODEL_PATTERN` (Opilot-specific heuristic)
- Tool ID mapping (`generateToolCallId`, `mapToolCallId`)
- VS Code–specific `progress.report(new LanguageModelTextPart(...))` calls
- All sidebar/provider/extension wiring

---

## 3. Package Identity

```text
@opilot/llm-stream-parser
```

Published under the `@opilot` npm organization. MIT license. One runtime dependency (`saxophone`). Typescript-first, dual ESM + CJS build via `tsup`. Subpath exports for tree-shaking (see Section 10).

---

## 4. Package Structure

```text
packages/llm-stream-parser/
  src/
    thinking/
      ThinkingParser.ts          # streaming <think>/<|thinking|>/etc. splitter
      index.ts
    xml-filter/
      XmlStreamFilter.ts         # SAX streaming context-tag scrubber
      tagLists.ts                # built-in scrub sets: VSCODE_CONTEXT_TAGS, SYSTEM_WRAPPER_TAGS
      index.ts
    tool-calls/
      extractXmlToolCalls.ts     # bare <tool_name><param>val</param></tool_name>
      extractJsonWrappedCalls.ts # <toolCall>{"name":...}</toolCall> / <tool_call>
      buildXmlToolSystemPrompt.ts
      index.ts
    context/
      splitLeadingXmlContext.ts
      dedupeXmlContext.ts
      index.ts
    processor/
      LLMStreamProcessor.ts      # orchestration class combining all the above
      index.ts
    markdown/
      appendToBlockquote.ts      # streaming markdown blockquote helper
      index.ts
    adapters/
      vscode.ts                  # GitHub Copilot Chat / VS Code LM API
      generic.ts                 # plain AsyncIterable<StreamChunk>
    index.ts                     # all public exports
  test/
    thinking.test.ts
    xmlFilter.test.ts
    toolCalls.test.ts
    processor.test.ts
    adapters/vscode.test.ts
  package.json
  tsconfig.json
  tsup.config.ts
```

---

## 5. Core API Design

### 5a. Low-level primitives (framework-free)

These are direct ports with improved generics:

```typescript
// thinking/ThinkingParser.ts
export class ThinkingParser {
  constructor(options?: { openingTag?: string; closingTag?: string });
  addContent(chunk: string): [thinkingContent: string, regularContent: string];
  reset(): void;
}

// xml-filter/XmlStreamFilter.ts
export interface XmlStreamFilter {
  write(chunk: string): string;
  end(): string;
}
export function createXmlStreamFilter(options?: {
  /** Tags to scrub IN ADDITION to the built-in privacy/context defaults. */
  extraScrubTags?: Set<string>;
  /** Fully override the scrub set. Caution: omitting privacy-sensitive tags
   *  (user_info, userData, etc.) may leak private data into model output. */
  overrideScrubTags?: Set<string>;
}): XmlStreamFilter;
// Default scrub set: VSCODE_CONTEXT_TAGS ∪ SYSTEM_WRAPPER_TAGS ∪ PRIVACY_TAGS

// tool-calls/extractXmlToolCalls.ts
export interface XmlToolCall {
  name: string;
  parameters: Record<string, unknown>;
  format: 'bare-xml' | 'json-wrapped'; // lets consumer know which format was used
}
export function extractXmlToolCalls(text: string, knownTools: Set<string>): XmlToolCall[];
// handles both bare XML and <toolCall>JSON</toolCall> transparently
```

The key improvement during extraction: merge `extractXmlToolCalls` and the new JSON-wrapper path into one function — consumer doesn't need to care which format the model chose.

### 5b. Orchestration class

```typescript
// processor/LLMStreamProcessor.ts
export interface StreamChunk {
  content?: string;
  thinking?: string;
  tool_calls?: Array<{ function: { name: string; arguments: unknown } }>;
  done?: boolean;
}

export interface ProcessorOptions {
  parseThinkTags?: boolean; // default: true  — runs ThinkingParser on content
  scrubContextTags?: boolean; // default: true  — runs XmlStreamFilter on content
  extraScrubTags?: Set<string>; // additional tags to scrub on top of defaults
  overrideScrubTags?: Set<string>; // fully replace the scrub set (caution: may leak private data)
  knownTools?: Set<string>; // if set, activates XML tool call extraction on non-streaming
  thinkingOpenTag?: string; // default: '<think>'
  thinkingCloseTag?: string; // default: '</think>'
  thinkingTagMap?: Map<string, [string, string]>; // model-id → [openTag, closeTag] overrides
  onWarning?: (message: string, context?: Record<string, unknown>) => void;
  maxInputLength?: number; // max response chunk size in chars; truncates with warning
}

export interface ProcessedOutput {
  thinking: string; // thinking content delta for THIS chunk only (not accumulated)
  content: string; // clean content delta for this chunk
  toolCalls: XmlToolCall[];
  done: boolean;
}

export class LLMStreamProcessor {
  constructor(options?: ProcessorOptions);
  /** Process a single streaming chunk. Returns deltas, not accumulated state. */
  process(chunk: StreamChunk): ProcessedOutput;
  /** Process a complete (non-streaming) response in one call. */
  processComplete(response: StreamChunk): ProcessedOutput;
  /** Flush SAX buffer at end of stream. Must be called after the last process(). */
  flush(): ProcessedOutput;
  /** Read-only accumulated thinking content across all chunks. */
  get accumulatedThinking(): string;
  reset(): void;
}
```

### 5c. `StreamChunk` — canonical input type

`StreamChunk` is the library's canonical input shape. Callers using non-Ollama providers must map their chunks into it:

```typescript
// OpenAI-compatible mapping example:
const chunk: StreamChunk = {
  content: delta.content ?? undefined,
  thinking: delta.reasoning ?? undefined,
  tool_calls: delta.tool_calls?.map(tc => ({
    function: { name: tc.function.name, arguments: JSON.parse(tc.function.arguments) },
  })),
  done: choice.finish_reason != null,
};
```

The library does NOT import or depend on any provider SDK. Mapping is the caller's responsibility.

### 5d. Adapters

Ship two adapters in `0.x`. Additional adapters (Vercel, Anthropic, LangChain) are candidates for later minor releases when there is real demand — shipping them now creates a maintenance burden of tracking upstream SDK type changes.

Design inspirations (applied to the generic adapter, not as separate adapters):

- **Vercel AI SDK** — async generator transformation pattern
- **Anthropic SDK** — typed `ThinkingBlock` / `TextBlock` discrimination
- **LangChain.js** — `BaseOutputParser` composability

```typescript
// adapters/vscode.ts
// Takes a vscode.Progress or stream.markdown sink, routes thinking/content/tools
export function createVSCodeCopilotAdapter(options: {
  processor: LLMStreamProcessor
  stream: VSCodeChatStream    // { markdown(s: string): void } or progress.report-alike
  onToolCall: (call: XmlToolCall) => void | Promise<void>
  showThinking?: boolean
}): {
  write(chunk: StreamChunk): Promise<void>
  end(): Promise<void>
}

// adapters/generic.ts
// Async generator — works in extension host, Node.js, browsers, edge runtimes
export async function* processStream(
  source: AsyncIterable<StreamChunk>,
  options?: ProcessorOptions
): AsyncGenerator<ProcessedOutput>
```

---

## 6. Improvements Made During Extraction

### Configurable scrub tag sets (privacy-safe by default)

Currently `OUTPUT_SCRUB_TAG_NAMES` is hardcoded in formatting.ts. The library exposes:

- `VSCODE_CONTEXT_TAGS` — VS Code-injected only (`environment_info`, `user_info`, etc.)
- `PRIVACY_TAGS` — tags containing private user data (`user_info`, `userData`, `userPreferences`, `userMemory`, `sessionMemory`, `repository_memories`)
- `SYSTEM_WRAPPER_TAGS` — the broader meta-wrapper set
- `DEFAULT_SCRUB_TAGS` — `VSCODE_CONTEXT_TAGS ∪ SYSTEM_WRAPPER_TAGS ∪ PRIVACY_TAGS` (current behaviour)

The `extraScrubTags` option **adds to** the defaults. A separate `overrideScrubTags` option fully replaces them but logs a warning via `onWarning` if `PRIVACY_TAGS` are not included, to prevent accidental data leakage.

### Unified tool call extraction

Merge the bare-XML path and the `<toolCall>JSON</toolCall>` path. The merged `extractXmlToolCalls` checks for JSON-object content inside generic wrapper tags first, then falls through to named-tag extraction. Returns `XmlToolCall[]` with a `format` discriminant so callers can observe which format the model used (useful for logging/correction).

**Pipeline ordering**: in the `LLMStreamProcessor`, XML tool call extraction runs on raw content **before** the SAX scrub filter removes `<toolCall>`/`<tool_call>` tags. This ensures the processor has a chance to parse and execute the tool call before the tag is stripped from visible output. When `knownTools` is not set, `toolCall`/`tool_call` tags are scrubbed unconditionally.

### `ThinkingParser` tag configurability

Already supports custom tags via constructor. During extraction: expose a convenience factory `ThinkingParser.forModel(modelId: string)` that picks the right tag pair (`<think>` for most, `<|thinking|>` for some fine-tunes, etc.) from a built-in map. The map is extensible via `ProcessorOptions.thinkingTagMap` so callers can add their own model-to-tag mappings without waiting for a library release.

### `appendToBlockquote` utility

Port the `appendToBlockquote(text, atLineStart)` helper from provider.ts. This correctly prefixes streamed markdown text with `>` at line boundaries, handling chunk-boundary line breaks. Useful for any consumer that renders thinking content in a blockquote.

### `formatXmlLikeResponseForDisplay`

Port from formatting.ts. Converts `<note>text</note>` → `**Note**\ntext`. This is opinionated formatting — exported as a standalone utility, not applied automatically by the processor. Consumers opt in via `sanitizeNonStreamingModelOutput()` or by calling it directly.

### `saxophone` dependency note

`saxophone` is kept as a runtime dependency. It is unmaintained (last publish 2020) but stable and battle-tested. A future plan item should evaluate vendoring a fork or writing a minimal replacement if upstream remains inactive.

---

## 7. How Opilot Consumes It Back

The Opilot extension becomes a consumer:

```typescript
// src/provider.ts — after
import { LLMStreamProcessor, createVSCodeCopilotAdapter } from '@opilot/llm-stream-parser';

const processor = new LLMStreamProcessor({
  parseThinkTags: shouldThink,
  scrubContextTags: true,
  knownTools: effectiveTools ? new Set(effectiveTools.map(t => t.function.name)) : undefined,
});

for await (const chunk of response) {
  const out = processor.process(chunk.message);
  // route out.thinking, out.content, out.toolCalls to progress.report(...)
}
const final = processor.flush();
```

formatting.ts, thinkingParser.ts, and toolUtils.ts become thin re-exports or are deleted entirely once the dependency is in place.

---

## 8. Repo Layout

Two options:

**Option A — Separate repo** (`github.com/opilot/llm-stream-parser`)
Simpler for external contributors, clean versioning. Downside: cross-repo sync during active Opilot development.

**Option B — Monorepo in this repo** (`packages/llm-stream-parser/`)
Better while the library is still co-evolving with Opilot. Extract to separate repo when API stabilizes.

**Recommendation: Option B first**, extract to its own repo at 1.0 — same pattern Vercel used with their `ai` package initially inside `next.js`.

---

## 9. Testing Strategy

- Port and expand existing tests from thinkingParser.test.ts, formatting.test.ts, toolUtils.test.ts
- Add corpus tests: real model response snapshots (a directory of `{input, expected}` fixture files) for cogito, deepseek-r1, qwen3, llama3.2 — covering each known output format variant
- Adapter tests use mocked sink types (no VS Code import)
- Performance regression test from the existing benchmark in formatting.test.ts moves into the library's test suite
- Security tests: verify `PRIVACY_TAGS` are always scrubbed with default options; verify `overrideScrubTags` logs a warning when privacy tags are omitted
- Input size tests: verify `maxInputLength` truncation works correctly and fires `onWarning`

---

## 10. Publishing & Exports

- `npm publish --access public` under `@opilot/llm-stream-parser`
- Changeset-based releases if staying in the monorepo
- API documentation generated via TypeDoc and published alongside the package

### Subpath exports

Consumers who only need a subset can import from subpaths to keep bundle size minimal:

```jsonc
// package.json exports map
{
  ".": "./dist/index.js",
  "./thinking": "./dist/thinking/index.js",
  "./xml-filter": "./dist/xml-filter/index.js",
  "./tool-calls": "./dist/tool-calls/index.js",
  "./context": "./dist/context/index.js",
  "./markdown": "./dist/markdown/index.js",
  "./processor": "./dist/processor/index.js",
  "./adapters/vscode": "./dist/adapters/vscode.js",
  "./adapters/generic": "./dist/adapters/generic.js",
}
```

### API stability contract

- **`0.x`**: any breaking change allowed between minor versions. Consumers should pin exact versions.
- **`1.0`**: public types and function signatures are frozen. No removal or signature change to `process()`, `processComplete()`, `flush()`, `addContent()`, `createXmlStreamFilter()`, `extractXmlToolCalls()`, `processStream()`. New features are additive only (new optional fields, new exports). Deprecations require one minor release of deprecation warnings before removal in the next major.

---

## 11. Security & Privacy

- **Privacy-safe defaults**: `DEFAULT_SCRUB_TAGS` always includes `PRIVACY_TAGS`. Consumers cannot accidentally leak `user_info`, `userData`, `userMemory`, etc. without explicitly using `overrideScrubTags`.
- **`overrideScrubTags` warning**: when privacy tags are omitted from an override set, the processor fires `onWarning('Privacy-sensitive tags omitted from scrub set: ...')`.
- **Tool schema safety**: `buildXmlToolSystemPrompt()` documentation warns that tool schemas are injected verbatim into prompts and must not contain secrets or credentials.
- **Input size limits**: `maxInputLength` option (default: unlimited) allows consumers to cap per-chunk input size. Chunks exceeding the limit are truncated and an `onWarning` is fired. This mitigates regex backtracking risk in `extractXmlToolCalls` on adversarial input.
- **No network access**: the library makes zero network calls. All I/O is the caller's responsibility.

---

## 12. Known Limitations

- **Streaming XML tool call extraction is not supported.** `extractXmlToolCalls` operates on complete text (used in the non-streaming XML fallback path). In the streaming path, tool calls must arrive via the native `tool_calls` field on chunks. Buffering partial XML tool tags during streaming is a future enhancement.
- **`formatXmlLikeResponseForDisplay` is opinionated.** It converts arbitrary XML tags to markdown headings — useful for Opilot but may not match other consumers' formatting preferences. It is opt-in, not applied by default.
- **`saxophone` is unmaintained.** Tracked as a future plan item to vendor or replace.

---

## 13. Getting Started (Third-party Example)

```typescript
import { processStream } from '@opilot/llm-stream-parser/adapters/generic';

// ollamaStream is any AsyncIterable<{ message?: { content?, thinking?, tool_calls? }, done? }>
for await (const out of processStream(ollamaStream, { parseThinkTags: true })) {
  if (out.thinking) console.log('[thinking]', out.thinking);
  if (out.content) process.stdout.write(out.content);
  for (const call of out.toolCalls) {
    console.log('[tool call]', call.name, call.parameters);
  }
}
```

For non-streaming (single complete response):

```typescript
import { LLMStreamProcessor } from '@opilot/llm-stream-parser/processor';

const processor = new LLMStreamProcessor({ parseThinkTags: true });
const result = processor.processComplete({
  content: response.message.content,
  thinking: response.message.thinking,
  tool_calls: response.message.tool_calls,
});
console.log(result.content); // clean output, context tags stripped
```

---

## Resolved Decisions

1. **SAX**: keep `saxophone`. Replacing it is ~200 lines of implementation for a ~15 KB saving — not worth it for the initial port. Track upstream status; vendor a fork if it remains unmaintained past 1.0.

2. **Tool call parameter types**: use `Record<string, unknown>` in the library's public contract.
   - `vscode.lm.invokeTool` already accepts `input: Record<string, unknown>`, so `string` coercion is a net downgrade.
   - JSON-wrapped calls naturally preserve typed values (`5` stays `5`); bare-XML values remain strings, which are valid `unknown`.
   - Callers can always narrow to string; they cannot recover a coerced number.
   - Opilot's existing usages are unaffected since `string` is assignable to `unknown`.

3. **Streaming primitive**: async generator as the universal core; adapters bridge per-runtime.
   - `processStream()` (generic adapter) is an async generator — works in extension host, Node.js, browsers, edge runtimes.
   - **VS Code adapter**: consumes the generator via callback/sink. Extension-host-safe, no Web Streams required.
   - Additional adapters (Vercel `ReadableStream`, Anthropic, LangChain) are candidates for later minor releases. Not shipped in 0.x to keep the maintenance surface small.

4. **Adapter scope for 0.x**: ship only the generic async generator adapter and the VS Code adapter. Additional adapters added in later minors based on demand.
