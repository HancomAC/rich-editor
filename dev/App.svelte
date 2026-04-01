<script lang="ts">
  import TipTapEditor from "../src/components/TipTapEditor.svelte";
  import "../src/styles/editor.css";

  let html = $state("");

  async function handleUpload(file: File): Promise<string> {
    return URL.createObjectURL(file);
  }

  let showOutput = $state(false);
</script>

<h1>@hancomac/editor Dev</h1>
<TipTapEditor
  content=""
  onChange={(h) => (html = h)}
  onUploadFile={handleUpload}
/>
<details class="output" bind:open={showOutput}>
  <summary>HTML 출력</summary>
  <pre>{html}</pre>
</details>
