"use client";
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BlockHandle: () => BlockHandle,
  BubbleToolbar: () => BubbleToolbar,
  FixedToolbar: () => FixedToolbar,
  InputModal: () => InputModal,
  PdfBlock: () => PdfBlock,
  PdfViewer: () => PdfViewer,
  SLASH_MENU_ITEMS: () => SLASH_MENU_ITEMS,
  SlashCommandMenu: () => SlashCommandMenu,
  TableBubbleMenu: () => TableBubbleMenu,
  TipTapEditor: () => TipTapEditor,
  cn: () => cn,
  configurePdfJs: () => configurePdfJs,
  getPdfJs: () => getPdfJs,
  sanitizeHtml: () => sanitizeHtml,
  stripHtmlToExcerpt: () => stripHtmlToExcerpt
});
module.exports = __toCommonJS(index_exports);

// src/components/TipTapEditor.tsx
var import_react8 = require("@tiptap/react");
var import_starter_kit = __toESM(require("@tiptap/starter-kit"), 1);
var import_extension_code_block_lowlight = __toESM(require("@tiptap/extension-code-block-lowlight"), 1);
var import_lowlight = require("lowlight");
var import_cpp = __toESM(require("highlight.js/lib/languages/cpp"), 1);
var import_python = __toESM(require("highlight.js/lib/languages/python"), 1);
var import_extension_placeholder = __toESM(require("@tiptap/extension-placeholder"), 1);
var import_extension_image = __toESM(require("@tiptap/extension-image"), 1);
var import_extension_link = __toESM(require("@tiptap/extension-link"), 1);
var import_extension_underline = __toESM(require("@tiptap/extension-underline"), 1);
var import_extension_text_align = __toESM(require("@tiptap/extension-text-align"), 1);
var import_extension_color = __toESM(require("@tiptap/extension-color"), 1);
var import_extension_text_style = require("@tiptap/extension-text-style");
var import_extension_highlight = __toESM(require("@tiptap/extension-highlight"), 1);
var import_extension_task_list = __toESM(require("@tiptap/extension-task-list"), 1);
var import_extension_task_item = __toESM(require("@tiptap/extension-task-item"), 1);
var import_extension_subscript = __toESM(require("@tiptap/extension-subscript"), 1);
var import_extension_superscript = __toESM(require("@tiptap/extension-superscript"), 1);
var import_extension_typography = __toESM(require("@tiptap/extension-typography"), 1);
var import_extension_character_count = __toESM(require("@tiptap/extension-character-count"), 1);
var import_extension_table = require("@tiptap/extension-table");
var import_extension_table_row = require("@tiptap/extension-table-row");
var import_extension_table_header = require("@tiptap/extension-table-header");
var import_extension_table_cell = require("@tiptap/extension-table-cell");
var import_extension_youtube = __toESM(require("@tiptap/extension-youtube"), 1);
var import_extension_file_handler = __toESM(require("@tiptap/extension-file-handler"), 1);
var import_atom_one_dark = require("highlight.js/styles/atom-one-dark.css");
var import_core2 = require("@tiptap/core");

// node_modules/prosemirror-model/dist/index.js
function findDiffStart(a, b, pos) {
  for (let i = 0; ; i++) {
    if (i == a.childCount || i == b.childCount)
      return a.childCount == b.childCount ? null : pos;
    let childA = a.child(i), childB = b.child(i);
    if (childA == childB) {
      pos += childA.nodeSize;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return pos;
    if (childA.isText && childA.text != childB.text) {
      for (let j = 0; childA.text[j] == childB.text[j]; j++)
        pos++;
      return pos;
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffStart(childA.content, childB.content, pos + 1);
      if (inner != null)
        return inner;
    }
    pos += childA.nodeSize;
  }
}
function findDiffEnd(a, b, posA, posB) {
  for (let iA = a.childCount, iB = b.childCount; ; ) {
    if (iA == 0 || iB == 0)
      return iA == iB ? null : { a: posA, b: posB };
    let childA = a.child(--iA), childB = b.child(--iB), size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;
      posB -= size;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return { a: posA, b: posB };
    if (childA.isText && childA.text != childB.text) {
      let same = 0, minSize = Math.min(childA.text.length, childB.text.length);
      while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
        same++;
        posA--;
        posB--;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
      if (inner)
        return inner;
    }
    posA -= size;
    posB -= size;
  }
}
var Fragment = class _Fragment {
  /**
  @internal
  */
  constructor(content, size) {
    this.content = content;
    this.size = size || 0;
    if (size == null)
      for (let i = 0; i < content.length; i++)
        this.size += content[i].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(from, to, f, nodeStart = 0, parent) {
    for (let i = 0, pos = 0; pos < to; i++) {
      let child = this.content[i], end = pos + child.nodeSize;
      if (end > from && f(child, nodeStart + pos, parent || null, i) !== false && child.content.size) {
        let start = pos + 1;
        child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
      }
      pos = end;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(f) {
    this.nodesBetween(0, this.size, f);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(from, to, blockSeparator, leafText) {
    let text = "", first = true;
    this.nodesBetween(from, to, (node, pos) => {
      let nodeText = node.isText ? node.text.slice(Math.max(from, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
      if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
        if (first)
          first = false;
        else
          text += blockSeparator;
      }
      text += nodeText;
    }, 0);
    return text;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(other) {
    if (!other.size)
      return this;
    if (!this.size)
      return other;
    let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i = 0;
    if (last.isText && last.sameMarkup(first)) {
      content[content.length - 1] = last.withText(last.text + first.text);
      i = 1;
    }
    for (; i < other.content.length; i++)
      content.push(other.content[i]);
    return new _Fragment(content, this.size + other.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(from, to = this.size) {
    if (from == 0 && to == this.size)
      return this;
    let result = [], size = 0;
    if (to > from)
      for (let i = 0, pos = 0; pos < to; i++) {
        let child = this.content[i], end = pos + child.nodeSize;
        if (end > from) {
          if (pos < from || end > to) {
            if (child.isText)
              child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
            else
              child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
          }
          result.push(child);
          size += child.nodeSize;
        }
        pos = end;
      }
    return new _Fragment(result, size);
  }
  /**
  @internal
  */
  cutByIndex(from, to) {
    if (from == to)
      return _Fragment.empty;
    if (from == 0 && to == this.content.length)
      return this;
    return new _Fragment(this.content.slice(from, to));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(index, node) {
    let current = this.content[index];
    if (current == node)
      return this;
    let copy = this.content.slice();
    let size = this.size + node.nodeSize - current.nodeSize;
    copy[index] = node;
    return new _Fragment(copy, size);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(node) {
    return new _Fragment([node].concat(this.content), this.size + node.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(node) {
    return new _Fragment(this.content.concat(node), this.size + node.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(other) {
    if (this.content.length != other.content.length)
      return false;
    for (let i = 0; i < this.content.length; i++)
      if (!this.content[i].eq(other.content[i]))
        return false;
    return true;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(index) {
    let found2 = this.content[index];
    if (!found2)
      throw new RangeError("Index " + index + " out of range for " + this);
    return found2;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content[index] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    for (let i = 0, p = 0; i < this.content.length; i++) {
      let child = this.content[i];
      f(child, p, i);
      p += child.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(other, pos = 0) {
    return findDiffStart(this, other, pos);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(other, pos = this.size, otherPos = other.size) {
    return findDiffEnd(this, other, pos, otherPos);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(pos) {
    if (pos == 0)
      return retIndex(0, pos);
    if (pos == this.size)
      return retIndex(this.content.length, pos);
    if (pos > this.size || pos < 0)
      throw new RangeError(`Position ${pos} outside of fragment (${this})`);
    for (let i = 0, curPos = 0; ; i++) {
      let cur = this.child(i), end = curPos + cur.nodeSize;
      if (end >= pos) {
        if (end == pos)
          return retIndex(i + 1, end);
        return retIndex(i, curPos);
      }
      curPos = end;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((n) => n.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(schema, value) {
    if (!value)
      return _Fragment.empty;
    if (!Array.isArray(value))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return new _Fragment(value.map(schema.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(array) {
    if (!array.length)
      return _Fragment.empty;
    let joined, size = 0;
    for (let i = 0; i < array.length; i++) {
      let node = array[i];
      size += node.nodeSize;
      if (i && node.isText && array[i - 1].sameMarkup(node)) {
        if (!joined)
          joined = array.slice(0, i);
        joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
      } else if (joined) {
        joined.push(node);
      }
    }
    return new _Fragment(joined || array, size);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(nodes) {
    if (!nodes)
      return _Fragment.empty;
    if (nodes instanceof _Fragment)
      return nodes;
    if (Array.isArray(nodes))
      return this.fromArray(nodes);
    if (nodes.attrs)
      return new _Fragment([nodes], nodes.nodeSize);
    throw new RangeError("Can not convert " + nodes + " to a Fragment" + (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
};
Fragment.empty = new Fragment([], 0);
var found = { index: 0, offset: 0 };
function retIndex(index, offset) {
  found.index = index;
  found.offset = offset;
  return found;
}
function compareDeep(a, b) {
  if (a === b)
    return true;
  if (!(a && typeof a == "object") || !(b && typeof b == "object"))
    return false;
  let array = Array.isArray(a);
  if (Array.isArray(b) != array)
    return false;
  if (array) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compareDeep(a[i], b[i]))
        return false;
  } else {
    for (let p in a)
      if (!(p in b) || !compareDeep(a[p], b[p]))
        return false;
    for (let p in b)
      if (!(p in a))
        return false;
  }
  return true;
}
var Mark = class _Mark {
  /**
  @internal
  */
  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(set) {
    let copy, placed = false;
    for (let i = 0; i < set.length; i++) {
      let other = set[i];
      if (this.eq(other))
        return set;
      if (this.type.excludes(other.type)) {
        if (!copy)
          copy = set.slice(0, i);
      } else if (other.type.excludes(this.type)) {
        return set;
      } else {
        if (!placed && other.type.rank > this.type.rank) {
          if (!copy)
            copy = set.slice(0, i);
          copy.push(this);
          placed = true;
        }
        if (copy)
          copy.push(other);
      }
    }
    if (!copy)
      copy = set.slice();
    if (!placed)
      copy.push(this);
    return copy;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return set.slice(0, i).concat(set.slice(i + 1));
    return set;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(set) {
    for (let i = 0; i < set.length; i++)
      if (this.eq(set[i]))
        return true;
    return false;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(other) {
    return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    return obj;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(schema, json) {
    if (!json)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let type = schema.marks[json.type];
    if (!type)
      throw new RangeError(`There is no mark type ${json.type} in this schema`);
    let mark = type.create(json.attrs);
    type.checkAttrs(mark.attrs);
    return mark;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(a, b) {
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].eq(b[i]))
        return false;
    return true;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(marks) {
    if (!marks || Array.isArray(marks) && marks.length == 0)
      return _Mark.none;
    if (marks instanceof _Mark)
      return [marks];
    let copy = marks.slice();
    copy.sort((a, b) => a.type.rank - b.type.rank);
    return copy;
  }
};
Mark.none = [];
var ReplaceError = class extends Error {
};
var Slice = class _Slice {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(content, openStart, openEnd) {
    this.content = content;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(pos, fragment) {
    let content = insertInto(this.content, pos + this.openStart, fragment);
    return content && new _Slice(content, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(from, to) {
    return new _Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(other) {
    return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let json = { content: this.content.toJSON() };
    if (this.openStart > 0)
      json.openStart = this.openStart;
    if (this.openEnd > 0)
      json.openEnd = this.openEnd;
    return json;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(schema, json) {
    if (!json)
      return _Slice.empty;
    let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
    if (typeof openStart != "number" || typeof openEnd != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new _Slice(Fragment.fromJSON(schema, json.content), openStart, openEnd);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(fragment, openIsolating = true) {
    let openStart = 0, openEnd = 0;
    for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
      openStart++;
    for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
      openEnd++;
    return new _Slice(fragment, openStart, openEnd);
  }
};
Slice.empty = new Slice(Fragment.empty, 0, 0);
function removeRange(content, from, to) {
  let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
  let { index: indexTo, offset: offsetTo } = content.findIndex(to);
  if (offset == from || child.isText) {
    if (offsetTo != to && !content.child(indexTo).isText)
      throw new RangeError("Removing non-flat range");
    return content.cut(0, from).append(content.cut(to));
  }
  if (index != indexTo)
    throw new RangeError("Removing non-flat range");
  return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
}
function insertInto(content, dist, insert, parent) {
  let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
  if (offset == dist || child.isText) {
    if (parent && !parent.canReplace(index, index, insert))
      return null;
    return content.cut(0, dist).append(insert).append(content.cut(dist));
  }
  let inner = insertInto(child.content, dist - offset - 1, insert, child);
  return inner && content.replaceChild(index, child.copy(inner));
}
function replace($from, $to, slice) {
  if (slice.openStart > $from.depth)
    throw new ReplaceError("Inserted content deeper than insertion position");
  if ($from.depth - slice.openStart != $to.depth - slice.openEnd)
    throw new ReplaceError("Inconsistent open depths");
  return replaceOuter($from, $to, slice, 0);
}
function replaceOuter($from, $to, slice, depth) {
  let index = $from.index(depth), node = $from.node(depth);
  if (index == $to.index(depth) && depth < $from.depth - slice.openStart) {
    let inner = replaceOuter($from, $to, slice, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else if (!slice.content.size) {
    return close(node, replaceTwoWay($from, $to, depth));
  } else if (!slice.openStart && !slice.openEnd && $from.depth == depth && $to.depth == depth) {
    let parent = $from.parent, content = parent.content;
    return close(parent, content.cut(0, $from.parentOffset).append(slice.content).append(content.cut($to.parentOffset)));
  } else {
    let { start, end } = prepareSliceForReplace(slice, $from);
    return close(node, replaceThreeWay($from, start, end, $to, depth));
  }
}
function checkJoin(main, sub) {
  if (!sub.type.compatibleContent(main.type))
    throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
}
function joinable($before, $after, depth) {
  let node = $before.node(depth);
  checkJoin(node, $after.node(depth));
  return node;
}
function addNode(child, target) {
  let last = target.length - 1;
  if (last >= 0 && child.isText && child.sameMarkup(target[last]))
    target[last] = child.withText(target[last].text + child.text);
  else
    target.push(child);
}
function addRange($start, $end, depth, target) {
  let node = ($end || $start).node(depth);
  let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
  if ($start) {
    startIndex = $start.index(depth);
    if ($start.depth > depth) {
      startIndex++;
    } else if ($start.textOffset) {
      addNode($start.nodeAfter, target);
      startIndex++;
    }
  }
  for (let i = startIndex; i < endIndex; i++)
    addNode(node.child(i), target);
  if ($end && $end.depth == depth && $end.textOffset)
    addNode($end.nodeBefore, target);
}
function close(node, content) {
  node.type.checkContent(content);
  return node.copy(content);
}
function replaceThreeWay($from, $start, $end, $to, depth) {
  let openStart = $from.depth > depth && joinable($from, $start, depth + 1);
  let openEnd = $to.depth > depth && joinable($end, $to, depth + 1);
  let content = [];
  addRange(null, $from, depth, content);
  if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
    checkJoin(openStart, openEnd);
    addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
  } else {
    if (openStart)
      addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
    addRange($start, $end, depth, content);
    if (openEnd)
      addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function replaceTwoWay($from, $to, depth) {
  let content = [];
  addRange(null, $from, depth, content);
  if ($from.depth > depth) {
    let type = joinable($from, $to, depth + 1);
    addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment(content);
}
function prepareSliceForReplace(slice, $along) {
  let extra = $along.depth - slice.openStart, parent = $along.node(extra);
  let node = parent.copy(slice.content);
  for (let i = extra - 1; i >= 0; i--)
    node = $along.node(i).copy(Fragment.from(node));
  return {
    start: node.resolveNoCache(slice.openStart + extra),
    end: node.resolveNoCache(node.content.size - slice.openEnd - extra)
  };
}
var ResolvedPos = class _ResolvedPos {
  /**
  @internal
  */
  constructor(pos, path, parentOffset) {
    this.pos = pos;
    this.path = path;
    this.parentOffset = parentOffset;
    this.depth = path.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(val) {
    if (val == null)
      return this.depth;
    if (val < 0)
      return this.depth + val;
    return val;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(depth) {
    return this.path[this.resolveDepth(depth) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(depth) {
    return this.path[this.resolveDepth(depth) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(depth) {
    depth = this.resolveDepth(depth);
    return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(depth) {
    depth = this.resolveDepth(depth);
    return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(depth) {
    depth = this.resolveDepth(depth);
    return this.start(depth) + this.node(depth).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position before the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position after the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let parent = this.parent, index = this.index(this.depth);
    if (index == parent.childCount)
      return null;
    let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
    return dOff ? parent.child(index).cut(dOff) : child;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let index = this.index(this.depth);
    let dOff = this.pos - this.path[this.path.length - 1];
    if (dOff)
      return this.parent.child(index).cut(0, dOff);
    return index == 0 ? null : this.parent.child(index - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(index, depth) {
    depth = this.resolveDepth(depth);
    let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    for (let i = 0; i < index; i++)
      pos += node.child(i).nodeSize;
    return pos;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let parent = this.parent, index = this.index();
    if (parent.content.size == 0)
      return Mark.none;
    if (this.textOffset)
      return parent.child(index).marks;
    let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
    if (!main) {
      let tmp = main;
      main = other;
      other = tmp;
    }
    let marks = main.marks;
    for (var i = 0; i < marks.length; i++)
      if (marks[i].type.spec.inclusive === false && (!other || !marks[i].isInSet(other.marks)))
        marks = marks[i--].removeFromSet(marks);
    return marks;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross($end) {
    let after = this.parent.maybeChild(this.index());
    if (!after || !after.isInline)
      return null;
    let marks = after.marks, next = $end.parent.maybeChild($end.index());
    for (var i = 0; i < marks.length; i++)
      if (marks[i].type.spec.inclusive === false && (!next || !marks[i].isInSet(next.marks)))
        marks = marks[i--].removeFromSet(marks);
    return marks;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(pos) {
    for (let depth = this.depth; depth > 0; depth--)
      if (this.start(depth) <= pos && this.end(depth) >= pos)
        return depth;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(other = this, pred) {
    if (other.pos < this.pos)
      return other.blockRange(this);
    for (let d = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0); d >= 0; d--)
      if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
        return new NodeRange(this, other, d);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(other) {
    return this.pos - this.parentOffset == other.pos - other.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(other) {
    return other.pos > this.pos ? other : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(other) {
    return other.pos < this.pos ? other : this;
  }
  /**
  @internal
  */
  toString() {
    let str = "";
    for (let i = 1; i <= this.depth; i++)
      str += (str ? "/" : "") + this.node(i).type.name + "_" + this.index(i - 1);
    return str + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(doc, pos) {
    if (!(pos >= 0 && pos <= doc.content.size))
      throw new RangeError("Position " + pos + " out of range");
    let path = [];
    let start = 0, parentOffset = pos;
    for (let node = doc; ; ) {
      let { index, offset } = node.content.findIndex(parentOffset);
      let rem = parentOffset - offset;
      path.push(node, index, start + offset);
      if (!rem)
        break;
      node = node.child(index);
      if (node.isText)
        break;
      parentOffset = rem - 1;
      start += offset + 1;
    }
    return new _ResolvedPos(pos, path, parentOffset);
  }
  /**
  @internal
  */
  static resolveCached(doc, pos) {
    let cache = resolveCache.get(doc);
    if (cache) {
      for (let i = 0; i < cache.elts.length; i++) {
        let elt = cache.elts[i];
        if (elt.pos == pos)
          return elt;
      }
    } else {
      resolveCache.set(doc, cache = new ResolveCache());
    }
    let result = cache.elts[cache.i] = _ResolvedPos.resolve(doc, pos);
    cache.i = (cache.i + 1) % resolveCacheSize;
    return result;
  }
};
var ResolveCache = class {
  constructor() {
    this.elts = [];
    this.i = 0;
  }
};
var resolveCacheSize = 12;
var resolveCache = /* @__PURE__ */ new WeakMap();
var NodeRange = class {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor($from, $to, depth) {
    this.$from = $from;
    this.$to = $to;
    this.depth = depth;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
};
var emptyAttrs = /* @__PURE__ */ Object.create(null);
var Node = class _Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks = Mark.none) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks;
    this.content = content || Fragment.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(index) {
    return this.content.child(index);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content.maybeChild(index);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    this.content.forEach(f);
  }
  /**
  Invoke a callback for all descendant nodes recursively between
  the given two positions that are relative to start of this
  node's content. The callback is invoked with the node, its
  position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(from, to, f, startPos = 0) {
    this.content.nodesBetween(from, to, f, startPos, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(f) {
    this.nodesBetween(0, this.content.size, f);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(from, to, blockSeparator, leafText) {
    return this.content.textBetween(from, to, blockSeparator, leafText);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(other) {
    return this == other || this.sameMarkup(other) && this.content.eq(other.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(other) {
    return this.hasMarkup(other.type, other.attrs, other.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(type, attrs, marks) {
    return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark.sameSet(this.marks, marks || Mark.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(content = null) {
    if (content == this.content)
      return this;
    return new _Node(this.type, this.attrs, content, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(marks) {
    return marks == this.marks ? this : new _Node(this.type, this.attrs, this.content, marks);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(from, to = this.content.size) {
    if (from == 0 && to == this.content.size)
      return this;
    return this.copy(this.content.cut(from, to));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(from, to = this.content.size, includeParents = false) {
    if (from == to)
      return Slice.empty;
    let $from = this.resolve(from), $to = this.resolve(to);
    let depth = includeParents ? 0 : $from.sharedDepth(to);
    let start = $from.start(depth), node = $from.node(depth);
    let content = node.content.cut($from.pos - start, $to.pos - start);
    return new Slice(content, $from.depth - depth, $to.depth - depth);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(from, to, slice) {
    return replace(this.resolve(from), this.resolve(to), slice);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(pos) {
    for (let node = this; ; ) {
      let { index, offset } = node.content.findIndex(pos);
      node = node.maybeChild(index);
      if (!node)
        return null;
      if (offset == pos || node.isText)
        return node;
      pos -= offset + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(pos) {
    let { index, offset } = this.content.findIndex(pos);
    return { node: this.content.maybeChild(index), index, offset };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(pos) {
    if (pos == 0)
      return { node: null, index: 0, offset: 0 };
    let { index, offset } = this.content.findIndex(pos);
    if (offset < pos)
      return { node: this.content.child(index), index, offset };
    let node = this.content.child(index - 1);
    return { node, index: index - 1, offset: offset - node.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(pos) {
    return ResolvedPos.resolveCached(this, pos);
  }
  /**
  @internal
  */
  resolveNoCache(pos) {
    return ResolvedPos.resolve(this, pos);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(from, to, type) {
    let found2 = false;
    if (to > from)
      this.nodesBetween(from, to, (node) => {
        if (type.isInSet(node.marks))
          found2 = true;
        return !found2;
      });
    return found2;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let name = this.type.name;
    if (this.content.size)
      name += "(" + this.content.toStringInner() + ")";
    return wrapMarks(this.marks, name);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(index) {
    let match = this.type.contentMatch.matchFragment(this.content, 0, index);
    if (!match)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return match;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(from, to, replacement = Fragment.empty, start = 0, end = replacement.childCount) {
    let one = this.contentMatchAt(from).matchFragment(replacement, start, end);
    let two = one && one.matchFragment(this.content, to);
    if (!two || !two.validEnd)
      return false;
    for (let i = start; i < end; i++)
      if (!this.type.allowsMarks(replacement.child(i).marks))
        return false;
    return true;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(from, to, type, marks) {
    if (marks && !this.type.allowsMarks(marks))
      return false;
    let start = this.contentMatchAt(from).matchType(type);
    let end = start && start.matchFragment(this.content, to);
    return end ? end.validEnd : false;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(other) {
    if (other.content.size)
      return this.canReplace(this.childCount, this.childCount, other.content);
    else
      return this.type.compatibleContent(other.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content);
    this.type.checkAttrs(this.attrs);
    let copy = Mark.none;
    for (let i = 0; i < this.marks.length; i++) {
      let mark = this.marks[i];
      mark.type.checkAttrs(mark.attrs);
      copy = mark.addToSet(copy);
    }
    if (!Mark.sameSet(copy, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m) => m.type.name)}`);
    this.content.forEach((node) => node.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    if (this.content.size)
      obj.content = this.content.toJSON();
    if (this.marks.length)
      obj.marks = this.marks.map((n) => n.toJSON());
    return obj;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(schema, json) {
    if (!json)
      throw new RangeError("Invalid input for Node.fromJSON");
    let marks = void 0;
    if (json.marks) {
      if (!Array.isArray(json.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      marks = json.marks.map(schema.markFromJSON);
    }
    if (json.type == "text") {
      if (typeof json.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return schema.text(json.text, marks);
    }
    let content = Fragment.fromJSON(schema, json.content);
    let node = schema.nodeType(json.type).create(json.attrs, content, marks);
    node.type.checkAttrs(node.attrs);
    return node;
  }
};
Node.prototype.text = void 0;
function wrapMarks(marks, str) {
  for (let i = marks.length - 1; i >= 0; i--)
    str = marks[i].type.name + "(" + str + ")";
  return str;
}
var ContentMatch = class _ContentMatch {
  /**
  @internal
  */
  constructor(validEnd) {
    this.validEnd = validEnd;
    this.next = [];
    this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(string, nodeTypes) {
    let stream = new TokenStream(string, nodeTypes);
    if (stream.next == null)
      return _ContentMatch.empty;
    let expr = parseExpr(stream);
    if (stream.next)
      stream.err("Unexpected trailing text");
    let match = dfa(nfa(expr));
    checkForDeadEnds(match, stream);
    return match;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(type) {
    for (let i = 0; i < this.next.length; i++)
      if (this.next[i].type == type)
        return this.next[i].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(frag, start = 0, end = frag.childCount) {
    let cur = this;
    for (let i = start; cur && i < end; i++)
      cur = cur.matchType(frag.child(i).type);
    return cur;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let i = 0; i < this.next.length; i++) {
      let { type } = this.next[i];
      if (!(type.isText || type.hasRequiredAttrs()))
        return type;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(other) {
    for (let i = 0; i < this.next.length; i++)
      for (let j = 0; j < other.next.length; j++)
        if (this.next[i].type == other.next[j].type)
          return true;
    return false;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(after, toEnd = false, startIndex = 0) {
    let seen = [this];
    function search(match, types) {
      let finished = match.matchFragment(after, startIndex);
      if (finished && (!toEnd || finished.validEnd))
        return Fragment.from(types.map((tp) => tp.createAndFill()));
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
          seen.push(next);
          let found2 = search(next, types.concat(type));
          if (found2)
            return found2;
        }
      }
      return null;
    }
    return search(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(target) {
    for (let i = 0; i < this.wrapCache.length; i += 2)
      if (this.wrapCache[i] == target)
        return this.wrapCache[i + 1];
    let computed = this.computeWrapping(target);
    this.wrapCache.push(target, computed);
    return computed;
  }
  /**
  @internal
  */
  computeWrapping(target) {
    let seen = /* @__PURE__ */ Object.create(null), active = [{ match: this, type: null, via: null }];
    while (active.length) {
      let current = active.shift(), match = current.match;
      if (match.matchType(target)) {
        let result = [];
        for (let obj = current; obj.type; obj = obj.via)
          result.push(obj.type);
        return result.reverse();
      }
      for (let i = 0; i < match.next.length; i++) {
        let { type, next } = match.next[i];
        if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
          active.push({ match: type.contentMatch, type, via: current });
          seen[type.name] = true;
        }
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(n) {
    if (n >= this.next.length)
      throw new RangeError(`There's no ${n}th edge in this content match`);
    return this.next[n];
  }
  /**
  @internal
  */
  toString() {
    let seen = [];
    function scan(m) {
      seen.push(m);
      for (let i = 0; i < m.next.length; i++)
        if (seen.indexOf(m.next[i].next) == -1)
          scan(m.next[i].next);
    }
    scan(this);
    return seen.map((m, i) => {
      let out = i + (m.validEnd ? "*" : " ") + " ";
      for (let i2 = 0; i2 < m.next.length; i2++)
        out += (i2 ? ", " : "") + m.next[i2].type.name + "->" + seen.indexOf(m.next[i2].next);
      return out;
    }).join("\n");
  }
};
ContentMatch.empty = new ContentMatch(true);
var TokenStream = class {
  constructor(string, nodeTypes) {
    this.string = string;
    this.nodeTypes = nodeTypes;
    this.inline = null;
    this.pos = 0;
    this.tokens = string.split(/\s*(?=\b|\W|$)/);
    if (this.tokens[this.tokens.length - 1] == "")
      this.tokens.pop();
    if (this.tokens[0] == "")
      this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(tok) {
    return this.next == tok && (this.pos++ || true);
  }
  err(str) {
    throw new SyntaxError(str + " (in content expression '" + this.string + "')");
  }
};
function parseExpr(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSeq(stream));
  } while (stream.eat("|"));
  return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
}
function parseExprSeq(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSubscript(stream));
  } while (stream.next && stream.next != ")" && stream.next != "|");
  return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
}
function parseExprSubscript(stream) {
  let expr = parseExprAtom(stream);
  for (; ; ) {
    if (stream.eat("+"))
      expr = { type: "plus", expr };
    else if (stream.eat("*"))
      expr = { type: "star", expr };
    else if (stream.eat("?"))
      expr = { type: "opt", expr };
    else if (stream.eat("{"))
      expr = parseExprRange(stream, expr);
    else
      break;
  }
  return expr;
}
function parseNum(stream) {
  if (/\D/.test(stream.next))
    stream.err("Expected number, got '" + stream.next + "'");
  let result = Number(stream.next);
  stream.pos++;
  return result;
}
function parseExprRange(stream, expr) {
  let min = parseNum(stream), max = min;
  if (stream.eat(",")) {
    if (stream.next != "}")
      max = parseNum(stream);
    else
      max = -1;
  }
  if (!stream.eat("}"))
    stream.err("Unclosed braced range");
  return { type: "range", min, max, expr };
}
function resolveName(stream, name) {
  let types = stream.nodeTypes, type = types[name];
  if (type)
    return [type];
  let result = [];
  for (let typeName in types) {
    let type2 = types[typeName];
    if (type2.isInGroup(name))
      result.push(type2);
  }
  if (result.length == 0)
    stream.err("No node type or group '" + name + "' found");
  return result;
}
function parseExprAtom(stream) {
  if (stream.eat("(")) {
    let expr = parseExpr(stream);
    if (!stream.eat(")"))
      stream.err("Missing closing paren");
    return expr;
  } else if (!/\W/.test(stream.next)) {
    let exprs = resolveName(stream, stream.next).map((type) => {
      if (stream.inline == null)
        stream.inline = type.isInline;
      else if (stream.inline != type.isInline)
        stream.err("Mixing inline and block content");
      return { type: "name", value: type };
    });
    stream.pos++;
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  } else {
    stream.err("Unexpected token '" + stream.next + "'");
  }
}
function nfa(expr) {
  let nfa2 = [[]];
  connect(compile(expr, 0), node());
  return nfa2;
  function node() {
    return nfa2.push([]) - 1;
  }
  function edge(from, to, term) {
    let edge2 = { term, to };
    nfa2[from].push(edge2);
    return edge2;
  }
  function connect(edges, to) {
    edges.forEach((edge2) => edge2.to = to);
  }
  function compile(expr2, from) {
    if (expr2.type == "choice") {
      return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from)), []);
    } else if (expr2.type == "seq") {
      for (let i = 0; ; i++) {
        let next = compile(expr2.exprs[i], from);
        if (i == expr2.exprs.length - 1)
          return next;
        connect(next, from = node());
      }
    } else if (expr2.type == "star") {
      let loop = node();
      edge(from, loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "plus") {
      let loop = node();
      connect(compile(expr2.expr, from), loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "opt") {
      return [edge(from)].concat(compile(expr2.expr, from));
    } else if (expr2.type == "range") {
      let cur = from;
      for (let i = 0; i < expr2.min; i++) {
        let next = node();
        connect(compile(expr2.expr, cur), next);
        cur = next;
      }
      if (expr2.max == -1) {
        connect(compile(expr2.expr, cur), cur);
      } else {
        for (let i = expr2.min; i < expr2.max; i++) {
          let next = node();
          edge(cur, next);
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
      }
      return [edge(cur)];
    } else if (expr2.type == "name") {
      return [edge(from, void 0, expr2.value)];
    } else {
      throw new Error("Unknown expr type");
    }
  }
}
function cmp(a, b) {
  return b - a;
}
function nullFrom(nfa2, node) {
  let result = [];
  scan(node);
  return result.sort(cmp);
  function scan(node2) {
    let edges = nfa2[node2];
    if (edges.length == 1 && !edges[0].term)
      return scan(edges[0].to);
    result.push(node2);
    for (let i = 0; i < edges.length; i++) {
      let { term, to } = edges[i];
      if (!term && result.indexOf(to) == -1)
        scan(to);
    }
  }
}
function dfa(nfa2) {
  let labeled = /* @__PURE__ */ Object.create(null);
  return explore(nullFrom(nfa2, 0));
  function explore(states) {
    let out = [];
    states.forEach((node) => {
      nfa2[node].forEach(({ term, to }) => {
        if (!term)
          return;
        let set;
        for (let i = 0; i < out.length; i++)
          if (out[i][0] == term)
            set = out[i][1];
        nullFrom(nfa2, to).forEach((node2) => {
          if (!set)
            out.push([term, set = []]);
          if (set.indexOf(node2) == -1)
            set.push(node2);
        });
      });
    });
    let state = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
    for (let i = 0; i < out.length; i++) {
      let states2 = out[i][1].sort(cmp);
      state.next.push({ type: out[i][0], next: labeled[states2.join(",")] || explore(states2) });
    }
    return state;
  }
}
function checkForDeadEnds(match, stream) {
  for (let i = 0, work = [match]; i < work.length; i++) {
    let state = work[i], dead = !state.validEnd, nodes = [];
    for (let j = 0; j < state.next.length; j++) {
      let { type, next } = state.next[j];
      nodes.push(type.name);
      if (dead && !(type.isText || type.hasRequiredAttrs()))
        dead = false;
      if (work.indexOf(next) == -1)
        work.push(next);
    }
    if (dead)
      stream.err("Only non-generatable nodes (" + nodes.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}

// node_modules/prosemirror-transform/dist/index.js
var lower16 = 65535;
var factor16 = Math.pow(2, 16);
function makeRecover(index, offset) {
  return index + offset * factor16;
}
function recoverIndex(value) {
  return value & lower16;
}
function recoverOffset(value) {
  return (value - (value & lower16)) / factor16;
}
var DEL_BEFORE = 1;
var DEL_AFTER = 2;
var DEL_ACROSS = 4;
var DEL_SIDE = 8;
var MapResult = class {
  /**
  @internal
  */
  constructor(pos, delInfo, recover) {
    this.pos = pos;
    this.delInfo = delInfo;
    this.recover = recover;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & DEL_SIDE) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & DEL_ACROSS) > 0;
  }
};
var StepMap = class _StepMap {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(ranges, inverted = false) {
    this.ranges = ranges;
    this.inverted = inverted;
    if (!ranges.length && _StepMap.empty)
      return _StepMap.empty;
  }
  /**
  @internal
  */
  recover(value) {
    let diff = 0, index = recoverIndex(value);
    if (!this.inverted)
      for (let i = 0; i < index; i++)
        diff += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
    return this.ranges[index * 3] + diff + recoverOffset(value);
  }
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  map(pos, assoc = 1) {
    return this._map(pos, assoc, true);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex], end = start + oldSize;
      if (pos <= end) {
        let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
        let result = start + diff + (side < 0 ? 0 : newSize);
        if (simple)
          return result;
        let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i / 3, pos - start);
        let del = pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
        if (assoc < 0 ? pos != start : pos != end)
          del |= DEL_SIDE;
        return new MapResult(result, del, recover);
      }
      diff += newSize - oldSize;
    }
    return simple ? pos + diff : new MapResult(pos + diff, 0, null);
  }
  /**
  @internal
  */
  touches(pos, recover) {
    let diff = 0, index = recoverIndex(recover);
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i + oldIndex], end = start + oldSize;
      if (pos <= end && i == index * 3)
        return true;
      diff += this.ranges[i + newIndex] - oldSize;
    }
    return false;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(f) {
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i = 0, diff = 0; i < this.ranges.length; i += 3) {
      let start = this.ranges[i], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
      let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex];
      f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
      diff += newSize - oldSize;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new _StepMap(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(n) {
    return n == 0 ? _StepMap.empty : new _StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
  }
};
StepMap.empty = new StepMap([]);
var stepsByID = /* @__PURE__ */ Object.create(null);
var Step = class {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return StepMap.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(other) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(schema, json) {
    if (!json || !json.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let type = stepsByID[json.stepType];
    if (!type)
      throw new RangeError(`No step type ${json.stepType} defined`);
    return type.fromJSON(schema, json);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(id, stepClass) {
    if (id in stepsByID)
      throw new RangeError("Duplicate use of step JSON ID " + id);
    stepsByID[id] = stepClass;
    stepClass.prototype.jsonID = id;
    return stepClass;
  }
};
var StepResult = class _StepResult {
  /**
  @internal
  */
  constructor(doc, failed) {
    this.doc = doc;
    this.failed = failed;
  }
  /**
  Create a successful step result.
  */
  static ok(doc) {
    return new _StepResult(doc, null);
  }
  /**
  Create a failed step result.
  */
  static fail(message) {
    return new _StepResult(null, message);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(doc, from, to, slice) {
    try {
      return _StepResult.ok(doc.replace(from, to, slice));
    } catch (e) {
      if (e instanceof ReplaceError)
        return _StepResult.fail(e.message);
      throw e;
    }
  }
};
function mapFragment(fragment, f, parent) {
  let mapped = [];
  for (let i = 0; i < fragment.childCount; i++) {
    let child = fragment.child(i);
    if (child.content.size)
      child = child.copy(mapFragment(child.content, f, child));
    if (child.isInline)
      child = f(child, parent, i);
    mapped.push(child);
  }
  return Fragment.fromArray(mapped);
}
var AddMarkStep = class _AddMarkStep extends Step {
  /**
  Create a mark step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc) {
    let oldSlice = doc.slice(this.from, this.to), $from = doc.resolve(this.from);
    let parent = $from.node($from.sharedDepth(this.to));
    let slice = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
      if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
        return node;
      return node.mark(this.mark.addToSet(node.marks));
    }, parent), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc, this.from, this.to, slice);
  }
  invert() {
    return new RemoveMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new _AddMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new _AddMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
  }
};
Step.jsonID("addMark", AddMarkStep);
var RemoveMarkStep = class _RemoveMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(from, to, mark) {
    super();
    this.from = from;
    this.to = to;
    this.mark = mark;
  }
  apply(doc) {
    let oldSlice = doc.slice(this.from, this.to);
    let slice = new Slice(mapFragment(oldSlice.content, (node) => {
      return node.mark(this.mark.removeFromSet(node.marks));
    }, doc), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc, this.from, this.to, slice);
  }
  invert() {
    return new AddMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deleted && to.deleted || from.pos >= to.pos)
      return null;
    return new _RemoveMarkStep(from.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new _RemoveMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
  }
};
Step.jsonID("removeMark", RemoveMarkStep);
var AddNodeMarkStep = class _AddNodeMarkStep extends Step {
  /**
  Create a node mark step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc) {
    let node = doc.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
    return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc) {
    let node = doc.nodeAt(this.pos);
    if (node) {
      let newSet = this.mark.addToSet(node.marks);
      if (newSet.length == node.marks.length) {
        for (let i = 0; i < node.marks.length; i++)
          if (!node.marks[i].isInSet(newSet))
            return new _AddNodeMarkStep(this.pos, node.marks[i]);
        return new _AddNodeMarkStep(this.pos, this.mark);
      }
    }
    return new RemoveNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AddNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new _AddNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
  }
};
Step.jsonID("addNodeMark", AddNodeMarkStep);
var RemoveNodeMarkStep = class _RemoveNodeMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc) {
    let node = doc.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
    return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc) {
    let node = doc.nodeAt(this.pos);
    if (!node || !this.mark.isInSet(node.marks))
      return this;
    return new AddNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _RemoveNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new _RemoveNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
  }
};
Step.jsonID("removeNodeMark", RemoveNodeMarkStep);
var ReplaceStep = class _ReplaceStep extends Step {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(from, to, slice, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.slice = slice;
    this.structure = structure;
  }
  apply(doc) {
    if (this.structure && contentBetween(doc, this.from, this.to))
      return StepResult.fail("Structure replace would overwrite content");
    return StepResult.fromReplace(doc, this.from, this.to, this.slice);
  }
  getMap() {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }
  invert(doc) {
    return new _ReplaceStep(this.from, this.from + this.slice.size, doc.slice(this.from, this.to));
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from.deletedAcross && to.deletedAcross)
      return null;
    return new _ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice, this.structure);
  }
  merge(other) {
    if (!(other instanceof _ReplaceStep) || other.structure || this.structure)
      return null;
    if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
      return new _ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
    } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
      let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
      return new _ReplaceStep(other.from, this.to, slice, this.structure);
    } else {
      return null;
    }
  }
  toJSON() {
    let json = { stepType: "replace", from: this.from, to: this.to };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new _ReplaceStep(json.from, json.to, Slice.fromJSON(schema, json.slice), !!json.structure);
  }
};
Step.jsonID("replace", ReplaceStep);
var ReplaceAroundStep = class _ReplaceAroundStep extends Step {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(from, to, gapFrom, gapTo, slice, insert, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.gapFrom = gapFrom;
    this.gapTo = gapTo;
    this.slice = slice;
    this.insert = insert;
    this.structure = structure;
  }
  apply(doc) {
    if (this.structure && (contentBetween(doc, this.from, this.gapFrom) || contentBetween(doc, this.gapTo, this.to)))
      return StepResult.fail("Structure gap-replace would overwrite content");
    let gap = doc.slice(this.gapFrom, this.gapTo);
    if (gap.openStart || gap.openEnd)
      return StepResult.fail("Gap is not a flat range");
    let inserted = this.slice.insertAt(this.insert, gap.content);
    if (!inserted)
      return StepResult.fail("Content does not fit in gap");
    return StepResult.fromReplace(doc, this.from, this.to, inserted);
  }
  getMap() {
    return new StepMap([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(doc) {
    let gap = this.gapTo - this.gapFrom;
    return new _ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(mapping) {
    let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    let gapFrom = this.from == this.gapFrom ? from.pos : mapping.map(this.gapFrom, -1);
    let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
    if (from.deletedAcross && to.deletedAcross || gapFrom < from.pos || gapTo > to.pos)
      return null;
    return new _ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let json = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema, json) {
    if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new _ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema, json.slice), json.insert, !!json.structure);
  }
};
Step.jsonID("replaceAround", ReplaceAroundStep);
function contentBetween(doc, from, to) {
  let $from = doc.resolve(from), dist = to - from, depth = $from.depth;
  while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
    depth--;
    dist--;
  }
  if (dist > 0) {
    let next = $from.node(depth).maybeChild($from.indexAfter(depth));
    while (dist > 0) {
      if (!next || next.isLeaf)
        return true;
      next = next.firstChild;
      dist--;
    }
  }
  return false;
}
var AttrStep = class _AttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(pos, attr, value) {
    super();
    this.pos = pos;
    this.attr = attr;
    this.value = value;
  }
  apply(doc) {
    let node = doc.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at attribute step's position");
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in node.attrs)
      attrs[name] = node.attrs[name];
    attrs[this.attr] = this.value;
    let updated = node.type.create(attrs, null, node.marks);
    return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc) {
    return new _AttrStep(this.pos, this.attr, doc.nodeAt(this.pos).attrs[this.attr]);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AttrStep(pos.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(schema, json) {
    if (typeof json.pos != "number" || typeof json.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new _AttrStep(json.pos, json.attr, json.value);
  }
};
Step.jsonID("attr", AttrStep);
var DocAttrStep = class _DocAttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(attr, value) {
    super();
    this.attr = attr;
    this.value = value;
  }
  apply(doc) {
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name in doc.attrs)
      attrs[name] = doc.attrs[name];
    attrs[this.attr] = this.value;
    let updated = doc.type.create(attrs, doc.content, doc.marks);
    return StepResult.ok(updated);
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc) {
    return new _DocAttrStep(this.attr, doc.attrs[this.attr]);
  }
  map(mapping) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(schema, json) {
    if (typeof json.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new _DocAttrStep(json.attr, json.value);
  }
};
Step.jsonID("docAttr", DocAttrStep);
var TransformError = class extends Error {
};
TransformError = function TransformError2(message) {
  let err = Error.call(this, message);
  err.__proto__ = TransformError2.prototype;
  return err;
};
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;
TransformError.prototype.name = "TransformError";

// node_modules/prosemirror-state/dist/index.js
var classesById = /* @__PURE__ */ Object.create(null);
var Selection = class {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++)
      if (ranges[i].$from.pos != ranges[i].$to.pos)
        return false;
    return true;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(tr, content = Slice.empty) {
    let lastNode = content.content.lastChild, lastParent = null;
    for (let i = 0; i < content.openEnd; i++) {
      lastParent = lastNode;
      lastNode = lastNode.lastChild;
    }
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
      if (i == 0)
        selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(tr, node) {
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i = 0; i < ranges.length; i++) {
      let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
      let from = mapping.map($from.pos), to = mapping.map($to.pos);
      if (i) {
        tr.deleteRange(from, to);
      } else {
        tr.replaceRangeWith(from, to, node);
        selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
      }
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom($pos, dir, textOnly = false) {
    let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
    if (inner)
      return inner;
    for (let depth = $pos.depth - 1; depth >= 0; depth--) {
      let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
      if (found2)
        return found2;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near($pos, bias = 1) {
    return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(doc) {
    return findSelectionIn(doc, doc, 0, 0, 1) || new AllSelection(doc);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(doc) {
    return findSelectionIn(doc, doc, doc.content.size, doc.childCount, -1) || new AllSelection(doc);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(doc, json) {
    if (!json || !json.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let cls = classesById[json.type];
    if (!cls)
      throw new RangeError(`No selection type ${json.type} defined`);
    return cls.fromJSON(doc, json);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(id, selectionClass) {
    if (id in classesById)
      throw new RangeError("Duplicate use of selection JSON ID " + id);
    classesById[id] = selectionClass;
    selectionClass.prototype.jsonID = id;
    return selectionClass;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
};
Selection.prototype.visible = true;
var SelectionRange = class {
  /**
  Create a range.
  */
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
};
var warnedAboutTextSelection = false;
function checkTextSelection($pos) {
  if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
    warnedAboutTextSelection = true;
    console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
  }
}
var TextSelection = class _TextSelection extends Selection {
  /**
  Construct a text selection between the given points.
  */
  constructor($anchor, $head = $anchor) {
    checkTextSelection($anchor);
    checkTextSelection($head);
    super($anchor, $head);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(doc, mapping) {
    let $head = doc.resolve(mapping.map(this.head));
    if (!$head.parent.inlineContent)
      return Selection.near($head);
    let $anchor = doc.resolve(mapping.map(this.anchor));
    return new _TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
  }
  replace(tr, content = Slice.empty) {
    super.replace(tr, content);
    if (content == Slice.empty) {
      let marks = this.$from.marksAcross(this.$to);
      if (marks)
        tr.ensureMarks(marks);
    }
  }
  eq(other) {
    return other instanceof _TextSelection && other.anchor == this.anchor && other.head == this.head;
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc, json) {
    if (typeof json.anchor != "number" || typeof json.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new _TextSelection(doc.resolve(json.anchor), doc.resolve(json.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(doc, anchor, head = anchor) {
    let $anchor = doc.resolve(anchor);
    return new this($anchor, head == anchor ? $anchor : doc.resolve(head));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between($anchor, $head, bias) {
    let dPos = $anchor.pos - $head.pos;
    if (!bias || dPos)
      bias = dPos >= 0 ? 1 : -1;
    if (!$head.parent.inlineContent) {
      let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
      if (found2)
        $head = found2.$head;
      else
        return Selection.near($head, bias);
    }
    if (!$anchor.parent.inlineContent) {
      if (dPos == 0) {
        $anchor = $head;
      } else {
        $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
        if ($anchor.pos < $head.pos != dPos < 0)
          $anchor = $head;
      }
    }
    return new _TextSelection($anchor, $head);
  }
};
Selection.jsonID("text", TextSelection);
var TextBookmark = class _TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new _TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc) {
    return TextSelection.between(doc.resolve(this.anchor), doc.resolve(this.head));
  }
};
var NodeSelection = class _NodeSelection extends Selection {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor($pos) {
    let node = $pos.nodeAfter;
    let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }
  map(doc, mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    let $pos = doc.resolve(pos);
    if (deleted)
      return Selection.near($pos);
    return new _NodeSelection($pos);
  }
  content() {
    return new Slice(Fragment.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof _NodeSelection && other.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(doc, json) {
    if (typeof json.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new _NodeSelection(doc.resolve(json.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(doc, from) {
    return new _NodeSelection(doc.resolve(from));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
};
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
var NodeBookmark = class _NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    return deleted ? new TextBookmark(pos, pos) : new _NodeBookmark(pos);
  }
  resolve(doc) {
    let $pos = doc.resolve(this.anchor), node = $pos.nodeAfter;
    if (node && NodeSelection.isSelectable(node))
      return new NodeSelection($pos);
    return Selection.near($pos);
  }
};
var AllSelection = class _AllSelection extends Selection {
  /**
  Create an all-selection over the given document.
  */
  constructor(doc) {
    super(doc.resolve(0), doc.resolve(doc.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content == Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      let sel = Selection.atStart(tr.doc);
      if (!sel.eq(tr.selection))
        tr.setSelection(sel);
    } else {
      super.replace(tr, content);
    }
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(doc) {
    return new _AllSelection(doc);
  }
  map(doc) {
    return new _AllSelection(doc);
  }
  eq(other) {
    return other instanceof _AllSelection;
  }
  getBookmark() {
    return AllBookmark;
  }
};
Selection.jsonID("all", AllSelection);
var AllBookmark = {
  map() {
    return this;
  },
  resolve(doc) {
    return new AllSelection(doc);
  }
};
function findSelectionIn(doc, node, pos, index, dir, text = false) {
  if (node.inlineContent)
    return TextSelection.create(doc, pos);
  for (let i = index - (dir > 0 ? 0 : 1); dir > 0 ? i < node.childCount : i >= 0; i += dir) {
    let child = node.child(i);
    if (!child.isAtom) {
      let inner = findSelectionIn(doc, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
      if (inner)
        return inner;
    } else if (!text && NodeSelection.isSelectable(child)) {
      return NodeSelection.create(doc, pos - (dir < 0 ? child.nodeSize : 0));
    }
    pos += child.nodeSize * dir;
  }
  return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
  let last = tr.steps.length - 1;
  if (last < startLen)
    return;
  let step = tr.steps[last];
  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
    return;
  let map = tr.mapping.maps[last], end;
  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end == null)
      end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
function bind(f, self) {
  return !self || !f ? f : f.bind(self);
}
var FieldDesc = class {
  constructor(name, desc, self) {
    this.name = name;
    this.init = bind(desc.init, self);
    this.apply = bind(desc.apply, self);
  }
};
var baseFields = [
  new FieldDesc("doc", {
    init(config2) {
      return config2.doc || config2.schema.topNodeType.createAndFill();
    },
    apply(tr) {
      return tr.doc;
    }
  }),
  new FieldDesc("selection", {
    init(config2, instance) {
      return config2.selection || Selection.atStart(instance.doc);
    },
    apply(tr) {
      return tr.selection;
    }
  }),
  new FieldDesc("storedMarks", {
    init(config2) {
      return config2.storedMarks || null;
    },
    apply(tr, _marks, _old, state) {
      return state.selection.$cursor ? tr.storedMarks : null;
    }
  }),
  new FieldDesc("scrollToSelection", {
    init() {
      return 0;
    },
    apply(tr, prev) {
      return tr.scrolledIntoView ? prev + 1 : prev;
    }
  })
];

// src/components/TipTapEditor.tsx
var import_react9 = require("react");

// src/extensions/PdfBlock.ts
var import_core = require("@tiptap/core");
var import_react3 = require("@tiptap/react");

// src/extensions/PdfBlockView.tsx
var import_react = require("@tiptap/react");
var import_react2 = require("react");
var import_lucide_react = require("lucide-react");

// src/utils/pdf.ts
var cached = null;
var loading = null;
var config = {};
function configurePdfJs(cfg) {
  config = cfg;
  cached = null;
  loading = null;
}
async function getPdfJs() {
  if (cached) return cached;
  if (!loading) {
    loading = (async () => {
      const pdfSrc = config.pdfSrc || "/pdf.min.mjs";
      const workerSrc = config.workerSrc || "/pdf.worker.min.mjs";
      const res = await fetch(pdfSrc);
      if (!res.ok) throw new Error(`${pdfSrc} \uB85C\uB4DC \uC2E4\uD328`);
      const text = await res.text();
      const blob = new Blob([text], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const mod = await import(
        /* webpackIgnore: true */
        url
      );
      URL.revokeObjectURL(url);
      const pdfjsLib = mod;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      cached = pdfjsLib;
      return pdfjsLib;
    })();
  }
  return loading;
}

// src/extensions/PdfBlockView.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function PdfBlockView({ node, deleteNode, selected }) {
  const src = node.attrs.src;
  const name = node.attrs.name;
  const canvasRef = (0, import_react2.useRef)(null);
  const containerRef = (0, import_react2.useRef)(null);
  const [pdf, setPdf] = (0, import_react2.useState)(null);
  const [page, setPage] = (0, import_react2.useState)(1);
  const [total, setTotal] = (0, import_react2.useState)(0);
  const [loading2, setLoading] = (0, import_react2.useState)(true);
  const [error, setError] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        setLoading(true);
        setError(false);
        setPdf(null);
        setPage(1);
        const pdfjsLib = await getPdfJs();
        const loadingTask = pdfjsLib.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (!cancelled) {
          setPdf(pdfDoc);
          setTotal(pdfDoc.numPages);
          setLoading(false);
        }
      } catch (e) {
        console.error("[PdfBlockView] PDF \uB85C\uB4DC \uC2E4\uD328:", src, e);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [src]);
  const renderingRef = (0, import_react2.useRef)(false);
  const renderPage = (0, import_react2.useCallback)(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    try {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pageObj = await pdf.getPage(page);
      const unscaledViewport = pageObj.getViewport({ scale: 1 });
      const availableWidth = container.clientWidth - 32;
      if (availableWidth <= 0) return;
      const scale = availableWidth / unscaledViewport.width;
      const viewport = pageObj.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      await pageObj.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      renderingRef.current = false;
    }
  }, [pdf, page]);
  (0, import_react2.useEffect)(() => {
    renderPage();
  }, [renderPage]);
  (0, import_react2.useEffect)(() => {
    if (!pdf) return;
    let timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(renderPage, 100);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pdf, renderPage]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.NodeViewWrapper, { className: "my-4", contentEditable: false, "data-drag-handle": true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border rounded-lg overflow-hidden bg-muted/30 transition-shadow", style: {
    borderColor: selected ? "var(--primary)" : "var(--border)",
    boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent)" : "none"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-4 py-2 border-b border-border bg-background", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-muted-foreground truncate max-w-[200px]", children: name || "PDF \uBB38\uC11C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "a",
          {
            href: src,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "p-1 rounded hover:bg-muted transition-colors text-muted-foreground",
            title: "\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ExternalLink, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: deleteNode,
            className: "p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive",
            title: "\uC0AD\uC81C",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Trash2, { className: "w-4 h-4" })
          }
        )
      ] })
    ] }),
    loading2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex items-center justify-center p-8", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-muted-foreground animate-pulse", children: "PDF \uB85C\uB529 \uC911..." }) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col items-center justify-center p-8 gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-muted-foreground", children: "PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: src, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-primary hover:underline", children: "\uC9C1\uC811 \uB2E4\uC6B4\uB85C\uB4DC" })
    ] }),
    !loading2 && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: containerRef, className: "flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: canvasRef, className: "shadow-sm" }) }),
      total > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-background", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setPage((p) => Math.max(1, p - 1)),
            disabled: page <= 1,
            className: "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30",
            title: "\uC774\uC804 \uD398\uC774\uC9C0",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronLeft, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-sm tabular-nums", children: [
          page,
          " / ",
          total
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setPage((p) => Math.min(total, p + 1)),
            disabled: page >= total,
            className: "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30",
            title: "\uB2E4\uC74C \uD398\uC774\uC9C0",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronRight, { className: "w-4 h-4" })
          }
        )
      ] })
    ] })
  ] }) });
}

// src/extensions/PdfBlock.ts
var PdfBlock = import_core.Node.create({
  name: "pdfBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      name: { default: "PDF" }
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-pdf-src]",
        getAttrs: (dom) => ({
          src: dom.getAttribute("data-pdf-src"),
          name: dom.getAttribute("data-pdf-name") || "PDF"
        })
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src || "";
    const name = HTMLAttributes.name || "PDF";
    return [
      "div",
      (0, import_core.mergeAttributes)({ "data-pdf-src": src, "data-pdf-name": name }),
      [
        "p",
        {},
        [
          "a",
          { href: src, target: "_blank", rel: "noopener noreferrer" },
          `\u{1F4C4} ${name} (PDF)`
        ]
      ]
    ];
  },
  addNodeView() {
    return (0, import_react3.ReactNodeViewRenderer)(PdfBlockView);
  }
});

// src/components/FixedToolbar.tsx
var import_lucide_react3 = require("lucide-react");
var import_react5 = require("react");

// src/utils/cn.ts
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
}

// src/components/InputModal.tsx
var import_react4 = require("react");
var import_lucide_react2 = require("lucide-react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function InputModal({
  title,
  placeholder,
  defaultValue = "",
  onConfirm,
  onCancel
}) {
  const [value, setValue] = (0, import_react4.useState)(defaultValue);
  const inputRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", onClick: onCancel, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: "bg-background border border-border rounded-lg shadow-lg p-4 w-80",
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-sm font-medium", children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "p-0.5 rounded hover:bg-muted text-muted-foreground",
              onClick: onCancel,
              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.X, { size: 14 })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            ref: inputRef,
            type: "text",
            className: "w-full border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary",
            placeholder,
            value,
            onChange: (e) => setValue(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onCancel();
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex justify-end gap-2 mt-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "px-3 py-1 text-sm rounded border border-border hover:bg-muted",
              onClick: onCancel,
              children: "\uCDE8\uC18C"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "px-3 py-1 text-sm rounded bg-primary text-primary-foreground hover:opacity-90",
              onClick: handleSubmit,
              children: "\uD655\uC778"
            }
          )
        ] })
      ]
    }
  ) });
}

// src/components/FixedToolbar.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function Btn({
  onClick,
  active,
  title,
  disabled,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "button",
    {
      type: "button",
      onClick,
      title,
      disabled,
      className: cn(
        "p-1.5 rounded-md transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-30 pointer-events-none"
      ),
      children
    }
  );
}
function Sep() {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "w-px h-6 bg-border mx-0.5" });
}
function TableMenuButton({
  onClick,
  icon,
  label,
  destructive,
  disabled
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "button",
    {
      type: "button",
      disabled,
      className: cn(
        "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
        destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted",
        disabled && "opacity-30 pointer-events-none"
      ),
      onClick,
      children: [
        icon,
        label
      ]
    }
  );
}
function FixedToolbar({ editor, onPdfClick }) {
  const iconSize = 16;
  const [codeMenuOpen, setCodeMenuOpen] = (0, import_react5.useState)(false);
  const [tableMenuOpen, setTableMenuOpen] = (0, import_react5.useState)(false);
  const [modalState, setModalState] = (0, import_react5.useState)(null);
  const codeMenuRef = (0, import_react5.useRef)(null);
  const tableMenuRef = (0, import_react5.useRef)(null);
  (0, import_react5.useEffect)(() => {
    function handleClick(e) {
      if (codeMenuRef.current && !codeMenuRef.current.contains(e.target))
        setCodeMenuOpen(false);
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target))
        setTableMenuOpen(false);
    }
    if (codeMenuOpen || tableMenuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [codeMenuOpen, tableMenuOpen]);
  const addLink = (0, import_react5.useCallback)(() => {
    setModalState({ type: "link" });
  }, []);
  const addImage = (0, import_react5.useCallback)(() => {
    setModalState({ type: "image" });
  }, []);
  const isInTable = editor.isActive("table");
  const runTableCommand = (0, import_react5.useCallback)(
    (command) => {
      command();
      setTableMenuOpen(false);
    },
    []
  );
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "sticky top-[74px] z-10 flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-background rounded-t-xl", style: { top: "var(--header-height, 74px)" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleBold().run(),
        active: editor.isActive("bold"),
        title: "\uAD75\uAC8C",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Bold, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleItalic().run(),
        active: editor.isActive("italic"),
        title: "\uAE30\uC6B8\uC784",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Italic, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        active: editor.isActive("underline"),
        title: "\uBC11\uC904",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Underline, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleStrike().run(),
        active: editor.isActive("strike"),
        title: "\uCDE8\uC18C\uC120",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Strikethrough, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleHighlight().run(),
        active: editor.isActive("highlight"),
        title: "\uD558\uC774\uB77C\uC774\uD2B8",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Highlighter, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleSuperscript().run(),
        active: editor.isActive("superscript"),
        title: "\uC704\uCCA8\uC790",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Superscript, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleSubscript().run(),
        active: editor.isActive("subscript"),
        title: "\uC544\uB798\uCCA8\uC790",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Subscript, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Sep, {}),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().setTextAlign("left").run(),
        active: editor.isActive({ textAlign: "left" }),
        title: "\uC67C\uCABD \uC815\uB82C",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.AlignLeft, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().setTextAlign("center").run(),
        active: editor.isActive({ textAlign: "center" }),
        title: "\uAC00\uC6B4\uB370 \uC815\uB82C",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.AlignCenter, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().setTextAlign("right").run(),
        active: editor.isActive({ textAlign: "right" }),
        title: "\uC624\uB978\uCABD \uC815\uB82C",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.AlignRight, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Sep, {}),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        active: editor.isActive("heading", { level: 1 }),
        title: "\uC81C\uBAA9 1",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Heading1, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        active: editor.isActive("heading", { level: 2 }),
        title: "\uC81C\uBAA9 2",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Heading2, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        active: editor.isActive("heading", { level: 3 }),
        title: "\uC81C\uBAA9 3",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Heading3, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Sep, {}),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        active: editor.isActive("bulletList"),
        title: "\uAE00\uBA38\uB9AC \uBAA9\uB85D",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.List, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        active: editor.isActive("orderedList"),
        title: "\uBC88\uD638 \uBAA9\uB85D",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.ListOrdered, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleTaskList().run(),
        active: editor.isActive("taskList"),
        title: "\uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.CheckSquare, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        active: editor.isActive("blockquote"),
        title: "\uC778\uC6A9\uBB38",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Quote, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
        title: "\uAD6C\uBD84\uC120",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Minus, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Sep, {}),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Btn, { onClick: addLink, active: editor.isActive("link"), title: "\uB9C1\uD06C", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.LinkIcon, { size: iconSize }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Btn, { onClick: addImage, title: "\uC774\uBBF8\uC9C0", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.ImageIcon, { size: iconSize }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Btn, { onClick: onPdfClick, title: "PDF \uC0BD\uC785", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.FileText, { size: iconSize }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => {
          const url = window.prompt("YouTube URL\uC744 \uC785\uB825\uD558\uC138\uC694");
          if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
        },
        title: "YouTube \uC601\uC0C1",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Youtube, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { ref: tableMenuRef, className: "relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setTableMenuOpen((prev) => !prev),
          title: "\uD45C",
          className: cn(
            "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
            isInTable ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          ),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Table, { size: iconSize }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.ChevronDown, { size: 12 })
          ]
        }
      ),
      tableMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1", style: { minWidth: "220px" }, children: !isInTable ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Table, { size: 14 }),
            label: "\uD45C \uC0BD\uC785 (3x3)",
            onClick: () => runTableCommand(
              () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.PanelTop, { size: 14 }),
            label: "\uD5E4\uB354 \uD3EC\uD568 4x4",
            onClick: () => runTableCommand(
              () => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()
            )
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground", children: "\uAD6C\uC870" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Rows3, { size: 14 }),
            label: "\uD589 \uC704\uC5D0 \uCD94\uAC00",
            disabled: !editor.can().addRowBefore(),
            onClick: () => runTableCommand(() => editor.chain().focus().addRowBefore().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Rows3, { size: 14 }),
            label: "\uD589 \uC544\uB798\uC5D0 \uCD94\uAC00",
            disabled: !editor.can().addRowAfter(),
            onClick: () => runTableCommand(() => editor.chain().focus().addRowAfter().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Columns3, { size: 14 }),
            label: "\uC5F4 \uC67C\uCABD\uC5D0 \uCD94\uAC00",
            disabled: !editor.can().addColumnBefore(),
            onClick: () => runTableCommand(() => editor.chain().focus().addColumnBefore().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Columns3, { size: 14 }),
            label: "\uC5F4 \uC624\uB978\uCABD\uC5D0 \uCD94\uAC00",
            disabled: !editor.can().addColumnAfter(),
            onClick: () => runTableCommand(() => editor.chain().focus().addColumnAfter().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-px bg-border my-1" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground", children: "\uD5E4\uB354 / \uC140" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.PanelTop, { size: 14 }),
            label: "\uD5E4\uB354 \uD589 \uD1A0\uAE00",
            disabled: !editor.can().toggleHeaderRow(),
            onClick: () => runTableCommand(() => editor.chain().focus().toggleHeaderRow().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.PanelLeft, { size: 14 }),
            label: "\uD5E4\uB354 \uC5F4 \uD1A0\uAE00",
            disabled: !editor.can().toggleHeaderColumn(),
            onClick: () => runTableCommand(() => editor.chain().focus().toggleHeaderColumn().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Combine, { size: 14 }),
            label: "\uC140 \uBCD1\uD569",
            disabled: !editor.can().mergeCells(),
            onClick: () => runTableCommand(() => editor.chain().focus().mergeCells().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.SplitSquareHorizontal, { size: 14 }),
            label: "\uC140 \uBD84\uD560",
            disabled: !editor.can().splitCell(),
            onClick: () => runTableCommand(() => editor.chain().focus().splitCell().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Paintbrush, { size: 14 }),
            label: "\uC140 \uBC30\uACBD\uC0C9",
            onClick: () => {
              setTableMenuOpen(false);
              setModalState({ type: "cellBg" });
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-px bg-border my-1" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground", children: "\uC0AD\uC81C" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Rows3, { size: 14 }),
            label: "\uD589 \uC0AD\uC81C",
            destructive: true,
            disabled: !editor.can().deleteRow(),
            onClick: () => runTableCommand(() => editor.chain().focus().deleteRow().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Columns3, { size: 14 }),
            label: "\uC5F4 \uC0AD\uC81C",
            destructive: true,
            disabled: !editor.can().deleteColumn(),
            onClick: () => runTableCommand(() => editor.chain().focus().deleteColumn().run())
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TableMenuButton,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Trash2, { size: 14 }),
            label: "\uD45C \uC0AD\uC81C",
            destructive: true,
            disabled: !editor.can().deleteTable(),
            onClick: () => runTableCommand(() => editor.chain().focus().deleteTable().run())
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { ref: codeMenuRef, className: "relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setCodeMenuOpen((prev) => !prev),
          title: "\uCF54\uB4DC \uBE14\uB85D",
          className: cn(
            "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
            editor.isActive("codeBlock") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          ),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Code2, { size: iconSize }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.ChevronDown, { size: 12 })
          ]
        }
      ),
      codeMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1", style: { minWidth: "130px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
            onClick: () => {
              editor.chain().focus().setCodeBlock({ language: "cpp" }).run();
              setCodeMenuOpen(false);
            },
            children: "C++"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
            onClick: () => {
              editor.chain().focus().setCodeBlock({ language: "python" }).run();
              setCodeMenuOpen(false);
            },
            children: "Python"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "h-px bg-border my-1" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "button",
          {
            type: "button",
            className: "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
            onClick: () => {
              editor.chain().focus().setCodeBlock({ language: "" }).run();
              setCodeMenuOpen(false);
            },
            children: "\uC77C\uBC18 \uCF54\uB4DC"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Sep, {}),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().undo().run(),
        disabled: !editor.can().undo(),
        title: "\uC2E4\uD589 \uCDE8\uC18C",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Undo, { size: iconSize })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Btn,
      {
        onClick: () => editor.chain().focus().redo().run(),
        disabled: !editor.can().redo(),
        title: "\uB2E4\uC2DC \uC2E4\uD589",
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Redo, { size: iconSize })
      }
    ),
    modalState?.type === "link" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      InputModal,
      {
        title: "\uB9C1\uD06C URL \uC785\uB825",
        placeholder: "https://example.com",
        defaultValue: editor.getAttributes("link").href || "",
        onConfirm: (url) => {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          setModalState(null);
        },
        onCancel: () => setModalState(null)
      }
    ),
    modalState?.type === "image" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      InputModal,
      {
        title: "\uC774\uBBF8\uC9C0 URL \uC785\uB825",
        placeholder: "https://example.com/image.png",
        onConfirm: (url) => {
          editor.chain().focus().setImage({ src: url }).run();
          setModalState(null);
        },
        onCancel: () => setModalState(null)
      }
    ),
    modalState?.type === "cellBg" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", onClick: () => setModalState(null), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "bg-popover border border-border rounded-xl shadow-lg p-4", style: { minWidth: "240px" }, onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-sm font-semibold mb-3", children: "\uC140 \uBC30\uACBD\uC0C9" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "grid grid-cols-3 gap-2", children: [
        { label: "\uC5C6\uC74C", value: "" },
        { label: "\uBC1D\uC740 \uD68C\uC0C9", value: "#f1f5f9" },
        { label: "\uBC1D\uC740 \uD30C\uB791", value: "#dbeafe" },
        { label: "\uBC1D\uC740 \uCD08\uB85D", value: "#dcfce7" },
        { label: "\uBC1D\uC740 \uB178\uB791", value: "#fef9c3" },
        { label: "\uBC1D\uC740 \uC8FC\uD669", value: "#ffedd5" },
        { label: "\uBC1D\uC740 \uBE68\uAC15", value: "#fee2e2" },
        { label: "\uBC1D\uC740 \uBCF4\uB77C", value: "#ede9fe" },
        { label: "\uBC1D\uC740 \uBD84\uD64D", value: "#fce7f3" }
      ].map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          title: c.label,
          className: "h-9 rounded-lg border border-border transition-transform hover:scale-105 flex items-center justify-center text-xs",
          style: {
            background: c.value || "#fff",
            backgroundImage: !c.value ? "linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)" : void 0
          },
          onClick: () => {
            editor.chain().focus().setCellAttribute("backgroundColor", c.value || null).run();
            setModalState(null);
          },
          children: c.value ? "" : ""
        },
        c.value || "none"
      )) })
    ] }) })
  ] });
}

// src/components/SlashCommandMenu.tsx
var import_react6 = require("react");
var import_lucide_react4 = require("lucide-react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var SI = 14;
var SLASH_MENU_ITEMS = [
  {
    label: "\uC81C\uBAA9 1",
    keywords: "heading h1 \uC81C\uBAA9",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Heading1, { size: SI }),
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    label: "\uC81C\uBAA9 2",
    keywords: "heading h2 \uC81C\uBAA9",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Heading2, { size: SI }),
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    label: "\uC81C\uBAA9 3",
    keywords: "heading h3 \uC81C\uBAA9",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Heading3, { size: SI }),
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
  },
  {
    label: "\uAE00\uBA38\uB9AC \uBAA9\uB85D",
    keywords: "bullet list \uBAA9\uB85D \uB9AC\uC2A4\uD2B8",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.List, { size: SI }),
    command: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    label: "\uBC88\uD638 \uBAA9\uB85D",
    keywords: "ordered number list \uBC88\uD638 \uB9AC\uC2A4\uD2B8",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.ListOrdered, { size: SI }),
    command: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    label: "\uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
    keywords: "checklist task todo \uCCB4\uD06C \uD560\uC77C",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.CheckSquare, { size: SI }),
    command: (editor) => editor.chain().focus().toggleTaskList().run()
  },
  {
    label: "\uC778\uC6A9\uBB38",
    keywords: "quote blockquote \uC778\uC6A9",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Quote, { size: SI }),
    command: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    label: "\uAD6C\uBD84\uC120",
    keywords: "divider hr horizontal rule \uAD6C\uBD84",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Minus, { size: SI }),
    command: (editor) => editor.chain().focus().setHorizontalRule().run()
  },
  {
    label: "C++ \uCF54\uB4DC",
    keywords: "code cpp c++ \uCF54\uB4DC \uBE14\uB85D",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Code2, { size: SI }),
    command: (editor) => editor.chain().focus().setCodeBlock({ language: "cpp" }).run()
  },
  {
    label: "Python \uCF54\uB4DC",
    keywords: "code python \uD30C\uC774\uC36C \uCF54\uB4DC \uBE14\uB85D",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Code2, { size: SI }),
    command: (editor) => editor.chain().focus().setCodeBlock({ language: "python" }).run()
  },
  {
    label: "\uD45C",
    keywords: "table \uD45C \uD14C\uC774\uBE14",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Table, { size: SI }),
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    label: "YouTube \uC601\uC0C1",
    keywords: "youtube video \uC601\uC0C1 \uB3D9\uC601\uC0C1 \uC720\uD29C\uBE0C",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Youtube, { size: SI }),
    command: (editor) => {
      const url = window.prompt("YouTube URL\uC744 \uC785\uB825\uD558\uC138\uC694");
      if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  },
  {
    label: "\uC774\uBBF8\uC9C0",
    keywords: "image \uC774\uBBF8\uC9C0 \uC0AC\uC9C4 img",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.ImageIcon, { size: SI }),
    command: (editor) => {
      const url = window.prompt("\uC774\uBBF8\uC9C0 URL\uC744 \uC785\uB825\uD558\uC138\uC694");
      if (url) editor.chain().focus().setImage({ src: url }).run();
    }
  },
  {
    label: "\uB9C1\uD06C",
    keywords: "link url \uB9C1\uD06C \uD558\uC774\uD37C",
    icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.LinkIcon, { size: SI }),
    command: (editor) => {
      const url = window.prompt("\uB9C1\uD06C URL\uC744 \uC785\uB825\uD558\uC138\uC694");
      if (url)
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }
];
function SlashCommandMenu({
  editor,
  query,
  onClose,
  onPdfUpload
}) {
  const [selectedIndex, setSelectedIndex] = (0, import_react6.useState)(0);
  const menuRef = (0, import_react6.useRef)(null);
  const allItems = onPdfUpload ? [
    ...SLASH_MENU_ITEMS,
    {
      label: "PDF \uD30C\uC77C",
      keywords: "pdf \uD30C\uC77C \uBB38\uC11C",
      icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.FileText, { size: SI }),
      command: () => onPdfUpload()
    }
  ] : SLASH_MENU_ITEMS;
  const q = query.toLowerCase();
  const filtered = q ? allItems.filter(
    (item) => item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)
  ) : allItems;
  (0, import_react6.useEffect)(() => {
    setSelectedIndex(0);
  }, [query]);
  (0, import_react6.useEffect)(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => prev <= 0 ? filtered.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onClose();
          filtered[selectedIndex].command(editor);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, selectedIndex, editor, onClose]);
  (0, import_react6.useEffect)(() => {
    const el = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);
  if (filtered.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        ref: menuRef,
        className: "z-50 bg-popover border border-border rounded-lg shadow-lg p-2",
        style: { width: "180px" },
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-muted-foreground px-2 py-1", children: "\uACB0\uACFC \uC5C6\uC74C" })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      ref: menuRef,
      className: "z-50 bg-popover border border-border rounded-lg shadow-lg overflow-y-auto py-1",
      style: { width: "180px", maxHeight: "200px" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1.5", children: "\uBE14\uB85D" }),
        filtered.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "button",
          {
            type: "button",
            "data-index": i,
            className: `w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded-md mx-0 ${i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`,
            onMouseEnter: () => setSelectedIndex(i),
            onClick: () => {
              onClose();
              item.command(editor);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "flex items-center justify-center w-6 h-6 rounded border border-border bg-background text-muted-foreground shrink-0", children: item.icon }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-sm font-medium", children: item.label })
            ]
          },
          item.label
        ))
      ]
    }
  );
}

// src/components/TableBubbleMenu.tsx
var import_lucide_react5 = require("lucide-react");
var import_react7 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var PRESET_COLORS = [
  { label: "\uC5C6\uC74C", value: "" },
  { label: "\uBC1D\uC740 \uD68C\uC0C9", value: "#f1f5f9" },
  { label: "\uBC1D\uC740 \uD30C\uB791", value: "#dbeafe" },
  { label: "\uBC1D\uC740 \uCD08\uB85D", value: "#dcfce7" },
  { label: "\uBC1D\uC740 \uB178\uB791", value: "#fef9c3" },
  { label: "\uBC1D\uC740 \uC8FC\uD669", value: "#ffedd5" },
  { label: "\uBC1D\uC740 \uBE68\uAC15", value: "#fee2e2" },
  { label: "\uBC1D\uC740 \uBCF4\uB77C", value: "#ede9fe" },
  { label: "\uBC1D\uC740 \uBD84\uD64D", value: "#fce7f3" }
];
var LINE_HEIGHTS = [
  { label: "\uC881\uAC8C", value: "0.8" },
  { label: "\uBCF4\uD1B5", value: "1.0" },
  { label: "\uB113\uAC8C", value: "1.4" }
];
function TBtn({
  onClick,
  disabled,
  destructive,
  label,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "hce-table-btn-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "button",
      {
        type: "button",
        onClick,
        disabled,
        className: cn(
          "p-1.5 rounded-md transition-colors",
          destructive ? "text-white/70 hover:text-red-300 hover:bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10",
          disabled && "opacity-30 pointer-events-none"
        ),
        children
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "hce-table-btn-tooltip", children: label })
  ] });
}
function findTableNode(editor) {
  const { state } = editor;
  const { from } = state.selection;
  let tablePos = -1;
  let tableNode = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name === "table" && pos <= from && pos + node.nodeSize >= from) {
      tablePos = pos;
      tableNode = node;
      return false;
    }
  });
  return { tableNode, tablePos };
}
function TableBubbleMenu({ editor }) {
  const [visible, setVisible] = (0, import_react7.useState)(false);
  const [pos, setPos] = (0, import_react7.useState)({ top: 0, left: 0, width: 0 });
  const [showColors, setShowColors] = (0, import_react7.useState)(false);
  const [showLineHeight, setShowLineHeight] = (0, import_react7.useState)(false);
  const menuRef = (0, import_react7.useRef)(null);
  const iconSize = 14;
  const updatePosition = (0, import_react7.useCallback)(() => {
    if (!editor.isActive("table")) {
      setVisible(false);
      return;
    }
    const { from } = editor.state.selection;
    const domAtPos = editor.view.domAtPos(from);
    const tableEl = domAtPos.node?.closest?.("table") || domAtPos.node.parentElement?.closest?.("table");
    if (!tableEl) {
      setVisible(false);
      return;
    }
    const wrapper = editor.view.dom.closest(".hce-editor-wrapper");
    if (!wrapper) return;
    const tableRect = tableEl.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    setPos({
      top: tableRect.top - wrapperRect.top - 36,
      left: tableRect.left - wrapperRect.left,
      width: tableRect.width
    });
    setVisible(true);
  }, [editor]);
  (0, import_react7.useEffect)(() => {
    if (!editor) return;
    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
    };
  }, [editor, updatePosition]);
  (0, import_react7.useEffect)(() => {
    if (!showColors && !showLineHeight) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowColors(false);
        setShowLineHeight(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColors, showLineHeight]);
  if (!visible) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    "div",
    {
      ref: menuRef,
      className: "absolute z-20",
      style: { top: pos.top, left: pos.left, width: pos.width },
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center justify-center gap-0.5 px-1.5 py-1 bg-foreground rounded-lg shadow-xl w-fit mx-auto", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().addRowBefore().run(),
            disabled: !editor.can().addRowBefore(),
            label: "\uD589 \uC704\uC5D0 \uCD94\uAC00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.ArrowUpToLine, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().addRowAfter().run(),
            disabled: !editor.can().addRowAfter(),
            label: "\uD589 \uC544\uB798\uC5D0 \uCD94\uAC00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.ArrowDownToLine, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().addColumnBefore().run(),
            disabled: !editor.can().addColumnBefore(),
            label: "\uC5F4 \uC67C\uCABD\uC5D0 \uCD94\uAC00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.ArrowLeftToLine, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().addColumnAfter().run(),
            disabled: !editor.can().addColumnAfter(),
            label: "\uC5F4 \uC624\uB978\uCABD\uC5D0 \uCD94\uAC00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.ArrowRightToLine, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "w-px h-5 bg-white/20 mx-0.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().toggleHeaderRow().run(),
            disabled: !editor.can().toggleHeaderRow(),
            label: "\uD5E4\uB354 \uD589 \uD1A0\uAE00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.PanelTop, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().toggleHeaderColumn().run(),
            disabled: !editor.can().toggleHeaderColumn(),
            label: "\uD5E4\uB354 \uC5F4 \uD1A0\uAE00",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.PanelLeft, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().mergeCells().run(),
            disabled: !editor.can().mergeCells(),
            label: "\uC140 \uBCD1\uD569",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.Combine, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().splitCell().run(),
            disabled: !editor.can().splitCell(),
            label: "\uC140 \uBD84\uD560",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.SplitSquareHorizontal, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "w-px h-5 bg-white/20 mx-0.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TBtn,
            {
              onClick: () => {
                setShowLineHeight((v) => !v);
                setShowColors(false);
              },
              label: "\uC904 \uAC04\uACA9",
              children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.UnfoldVertical, { size: iconSize })
            }
          ),
          showLineHeight && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground rounded-lg shadow-xl border border-white/10 py-1", style: { minWidth: "100px" }, children: LINE_HEIGHTS.map((lh) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: "w-full text-left px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors",
              onClick: () => {
                const { state, dispatch } = editor.view;
                const { tr, doc } = state;
                const { tableNode, tablePos } = findTableNode(editor);
                if (!tableNode || tablePos < 0) return;
                tableNode.descendants((node, childPos) => {
                  if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
                    tr.setNodeMarkup(tablePos + childPos + 1, void 0, { ...node.attrs, lineHeight: lh.value });
                  }
                });
                dispatch(tr);
                setShowLineHeight(false);
              },
              children: lh.label
            },
            lh.value
          )) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => {
              const { tableNode, tablePos } = findTableNode(editor);
              if (!tableNode || tablePos < 0) return;
              const firstRow = tableNode.firstChild;
              if (!firstRow) return;
              const colCount = firstRow.childCount;
              if (colCount === 0) return;
              const domAtPos = editor.view.domAtPos(tablePos + 1);
              const tableEl = domAtPos.node?.closest?.("table") || domAtPos.node.parentElement?.closest?.("table");
              const tableWidth = tableEl?.clientWidth || 600;
              const equalWidth = Math.floor(tableWidth / colCount);
              const colwidths = Array(colCount).fill(equalWidth);
              const { tr } = editor.state;
              tableNode.descendants((node, childPos) => {
                if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
                  tr.setNodeMarkup(tablePos + childPos + 1, void 0, { ...node.attrs, colwidth: [equalWidth] });
                }
              });
              editor.view.dispatch(tr);
            },
            label: "\uB108\uBE44 \uB3D9\uC77C",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.EqualApproximately, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TBtn,
            {
              onClick: () => {
                setShowColors((v) => !v);
                setShowLineHeight(false);
              },
              label: "\uC140 \uBC30\uACBD\uC0C9",
              children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.Paintbrush, { size: iconSize })
            }
          ),
          showColors && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground rounded-lg shadow-xl border border-white/10 p-2", style: { minWidth: "160px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1.5 px-1", children: "\uBC30\uACBD\uC0C9" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "grid grid-cols-3 gap-1", children: PRESET_COLORS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "button",
              {
                type: "button",
                title: c.label,
                className: "w-full h-7 rounded-md border border-white/20 transition-transform hover:scale-110",
                style: {
                  background: c.value || "transparent",
                  backgroundImage: !c.value ? "linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)" : void 0
                },
                onClick: () => {
                  editor.chain().focus().setCellAttribute("backgroundColor", c.value || null).run();
                  setShowColors(false);
                }
              },
              c.value || "none"
            )) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "w-px h-5 bg-white/20 mx-0.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().deleteRow().run(),
            disabled: !editor.can().deleteRow(),
            destructive: true,
            label: "\uD589 \uC0AD\uC81C",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.RowsIcon, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().deleteColumn().run(),
            disabled: !editor.can().deleteColumn(),
            destructive: true,
            label: "\uC5F4 \uC0AD\uC81C",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.ColumnsIcon, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          TBtn,
          {
            onClick: () => editor.chain().focus().deleteTable().run(),
            disabled: !editor.can().deleteTable(),
            destructive: true,
            label: "\uD45C \uC0AD\uC81C",
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.Trash2, { size: iconSize })
          }
        )
      ] })
    }
  );
}

// src/components/TipTapEditor.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var cellAttrs = {
  backgroundColor: {
    default: null,
    parseHTML: (element) => element.style.backgroundColor || null,
    renderHTML: (attributes) => {
      const styles = [];
      if (attributes.backgroundColor) styles.push(`background-color: ${attributes.backgroundColor}`);
      if (attributes.lineHeight) styles.push(`line-height: ${attributes.lineHeight}`);
      return styles.length ? { style: styles.join("; ") } : {};
    }
  },
  lineHeight: {
    default: null,
    parseHTML: (element) => element.style.lineHeight || null,
    renderHTML: () => ({})
  }
};
var CustomTableCell = import_extension_table_cell.TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttrs };
  }
});
var CustomTableHeader = import_extension_table_header.TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttrs };
  }
});
var CodeBlockTopEscape = import_core2.Extension.create({
  name: "codeBlockTopEscape",
  addKeyboardShortcuts() {
    return {
      ArrowUp: () => {
        const { state, view } = this.editor;
        const { from } = state.selection;
        const firstNode = state.doc.firstChild;
        if (!firstNode) return false;
        if (firstNode.type.name !== "codeBlock") return false;
        const codeStart = 1;
        if (from !== codeStart) return false;
        const tr = state.tr.insert(0, state.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, 1));
        view.dispatch(tr);
        return true;
      }
    };
  }
});
var lowlight = (0, import_lowlight.createLowlight)(import_lowlight.common);
lowlight.register("cpp", import_cpp.default);
lowlight.register("python", import_python.default);
function TipTapEditor({
  content,
  onChange,
  placeholder = "'/'\uB97C \uB20C\uB7EC \uBA85\uB839\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694...",
  onUploadFile
}) {
  const [uploading, setUploading] = (0, import_react9.useState)(false);
  const pdfInputRef = (0, import_react9.useRef)(null);
  const editor = (0, import_react8.useEditor)({
    immediatelyRender: false,
    extensions: [
      import_starter_kit.default.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false
      }),
      import_extension_code_block_lowlight.default.configure({
        lowlight,
        defaultLanguage: "cpp"
      }),
      import_extension_placeholder.default.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = node.attrs.level;
            if (level === 1) return "\uC81C\uBAA9 1";
            if (level === 2) return "\uC81C\uBAA9 2";
            if (level === 3) return "\uC81C\uBAA9 3";
          }
          return placeholder;
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true
      }),
      import_extension_image.default.configure({ inline: false }),
      import_extension_link.default.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
      }),
      import_extension_underline.default,
      import_extension_text_align.default.configure({ types: ["heading", "paragraph"] }),
      import_extension_text_style.TextStyle,
      import_extension_color.default,
      import_extension_highlight.default.configure({ multicolor: true }),
      import_extension_task_list.default,
      import_extension_task_item.default.configure({ nested: true }),
      import_extension_subscript.default,
      import_extension_superscript.default,
      import_extension_typography.default,
      import_extension_character_count.default,
      import_extension_table.Table.configure({ resizable: true, allowTableNodeSelection: true }),
      import_extension_table_row.TableRow,
      CustomTableHeader,
      CustomTableCell,
      PdfBlock,
      CodeBlockTopEscape,
      import_extension_youtube.default.configure({ inline: false, allowFullscreen: true }),
      ...onUploadFile ? [
        import_extension_file_handler.default.configure({
          allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
          onDrop: (_currentEditor, files, pos) => {
            for (const file of files) {
              if (file.type.startsWith("image/")) {
                setUploading(true);
                onUploadFile(file).then((url) => {
                  _currentEditor.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: url } }).run();
                }).catch(() => alert("\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.")).finally(() => setUploading(false));
              }
            }
          },
          onPaste: (_currentEditor, files) => {
            for (const file of files) {
              if (file.type.startsWith("image/")) {
                setUploading(true);
                onUploadFile(file).then((url) => {
                  _currentEditor.chain().focus().setImage({ src: url }).run();
                }).catch(() => alert("\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.")).finally(() => setUploading(false));
              }
            }
          }
        })
      ] : []
    ],
    content,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML().replace(/(<p><br\s*\/?><\/p>\s*)+$/, "");
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none p-4"
      },
      scrollThreshold: 100,
      scrollMargin: 100
    }
  });
  (0, import_react9.useEffect)(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
      editor.commands.fixTables();
    }
  }, [content]);
  (0, import_react9.useEffect)(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      const { from } = editor.state.selection;
      try {
        const coords = editor.view.coordsAtPos(from);
        const margin = 120;
        if (coords.top < margin) {
          window.scrollBy({ top: coords.top - margin, behavior: "smooth" });
        } else if (coords.bottom > window.innerHeight - margin) {
          window.scrollBy({ top: coords.bottom - window.innerHeight + margin, behavior: "smooth" });
        }
      } catch {
      }
    };
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor]);
  (0, import_react9.useEffect)(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    const observer = new MutationObserver(() => {
      const wrapper = editorDom.closest(".hce-editor-wrapper");
      if (!wrapper) return;
      const maxW = wrapper.clientWidth - 32;
      wrapper.querySelectorAll("table").forEach((table) => {
        const cols = table.querySelectorAll("colgroup col");
        if (cols.length < 2) return;
        let total = 0;
        cols.forEach((col) => {
          total += parseInt(col.style.width || "0", 10);
        });
        if (total > maxW) {
          const lastCol = cols[cols.length - 1];
          const lastW = parseInt(lastCol.style.width || "0", 10);
          const newW = lastW - (total - maxW);
          if (newW >= 40) lastCol.style.width = `${newW}px`;
        }
      });
    });
    observer.observe(editorDom, { subtree: true, attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [editor]);
  const uploadPdf = (0, import_react9.useCallback)(
    (file) => {
      if (!editor || !onUploadFile) return;
      setUploading(true);
      onUploadFile(file).then((url) => {
        editor.chain().focus().insertContent({
          type: "pdfBlock",
          attrs: { src: url, name: file.name }
        }).run();
      }).catch(() => {
        alert("PDF \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }).finally(() => {
        setUploading(false);
      });
    },
    [editor, onUploadFile]
  );
  const [slashMenuOpen, setSlashMenuOpen] = (0, import_react9.useState)(false);
  const [slashMenuPos, setSlashMenuPos] = (0, import_react9.useState)({ top: 0, left: 0 });
  const [slashMenuDirection, setSlashMenuDirection] = (0, import_react9.useState)("down");
  const [slashQuery, setSlashQuery] = (0, import_react9.useState)("");
  const slashStartPos = (0, import_react9.useRef)(null);
  const MENU_HEIGHT = 210;
  const updateSlashMenuPosition = (0, import_react9.useCallback)(() => {
    if (!editor || slashStartPos.current === null) return;
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--header-height") || "74"
    );
    const toolbarEl = editor.view.dom.closest(".hce-editor-wrapper")?.querySelector(".sticky");
    const toolbarBottom = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : headerHeight;
    const topSafe = Math.max(toolbarBottom, headerHeight) + 4;
    const bottomBar = document.querySelector(".sticky.bottom-0");
    const bottomBarHeight = bottomBar ? bottomBar.getBoundingClientRect().height : 0;
    const bottomSafe = window.innerHeight - bottomBarHeight - 4;
    const spaceBelow = bottomSafe - coords.bottom;
    const spaceAbove = coords.top - topSafe;
    const goUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;
    let top;
    if (goUp) {
      top = Math.max(topSafe, coords.top - MENU_HEIGHT);
    } else {
      top = Math.min(coords.bottom + 4, bottomSafe - MENU_HEIGHT);
    }
    setSlashMenuDirection(goUp ? "up" : "down");
    setSlashMenuPos({ top, left: coords.left });
  }, [editor]);
  (0, import_react9.useEffect)(() => {
    if (!editor) return;
    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const $pos = state.doc.resolve(from);
      const lineStart = $pos.start();
      const lineText = state.doc.textBetween(lineStart, from, "\n");
      if (lineText.startsWith("/")) {
        if (slashStartPos.current === null) {
          slashStartPos.current = lineStart;
        }
        setSlashQuery(lineText.slice(1));
        setSlashMenuOpen(true);
        updateSlashMenuPosition();
      } else {
        if (slashMenuOpen) {
          setSlashMenuOpen(false);
          slashStartPos.current = null;
          setSlashQuery("");
        }
      }
    };
    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", () => {
      if (slashMenuOpen) {
        const { state } = editor;
        const { from } = state.selection;
        const $pos = state.doc.resolve(from);
        const lineStart = $pos.start();
        const lineText = state.doc.textBetween(lineStart, from, "\n");
        if (!lineText.startsWith("/")) {
          setSlashMenuOpen(false);
          slashStartPos.current = null;
          setSlashQuery("");
        }
      }
    });
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, slashMenuOpen, updateSlashMenuPosition]);
  (0, import_react9.useEffect)(() => {
    if (!slashMenuOpen) return;
    const onScroll = () => updateSlashMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [slashMenuOpen, updateSlashMenuPosition]);
  const deleteSlashText = (0, import_react9.useCallback)(() => {
    if (!editor || slashStartPos.current === null) return;
    const { state } = editor;
    const { from } = state.selection;
    editor.chain().focus().deleteRange({ from: slashStartPos.current, to: from }).run();
  }, [editor]);
  const closeSlashMenu = (0, import_react9.useCallback)(() => {
    deleteSlashText();
    setSlashMenuOpen(false);
    slashStartPos.current = null;
    setSlashQuery("");
  }, [deleteSlashText]);
  if (!editor) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "hce-editor-wrapper relative border border-border rounded-xl bg-background", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(FixedToolbar, { editor, onPdfClick: () => pdfInputRef.current?.click() }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react8.EditorContent, { editor }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TableBubbleMenu, { editor }),
    uploading && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-sm text-muted-foreground animate-pulse", children: "\uC5C5\uB85C\uB4DC \uC911..." }) }),
    slashMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "div",
      {
        style: { top: slashMenuPos.top, left: slashMenuPos.left },
        className: "fixed z-50",
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          SlashCommandMenu,
          {
            editor,
            query: slashQuery,
            onClose: closeSlashMenu,
            onPdfUpload: onUploadFile ? () => pdfInputRef.current?.click() : void 0
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex justify-end px-4 py-2 text-xs text-muted-foreground border-t border-border", children: [
      editor.storage.characterCount.characters(),
      " \uC790 \xB7 ",
      editor.storage.characterCount.words(),
      " \uB2E8\uC5B4"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "input",
      {
        ref: pdfInputRef,
        type: "file",
        accept: "application/pdf",
        className: "hidden",
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) uploadPdf(file);
          e.target.value = "";
        }
      }
    )
  ] });
}

// src/components/BubbleToolbar.tsx
var import_menus = require("@tiptap/react/menus");
var import_lucide_react6 = require("lucide-react");
var import_react10 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
function BubbleButton({
  onClick,
  active,
  title,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    "button",
    {
      type: "button",
      onClick,
      title,
      className: cn(
        "p-1.5 rounded-md transition-colors",
        active ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
      ),
      children
    }
  );
}
function BubbleDivider() {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "w-px h-5 bg-white/20 mx-0.5" });
}
function BubbleToolbar({ editor }) {
  const [showHeadings, setShowHeadings] = (0, import_react10.useState)(false);
  const iconSize = 14;
  const addLink = (0, import_react10.useCallback)(() => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("\uB9C1\uD06C URL\uC744 \uC785\uB825\uD558\uC138\uC694", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);
  const getCurrentBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "\uC81C\uBAA9 1";
    if (editor.isActive("heading", { level: 2 })) return "\uC81C\uBAA9 2";
    if (editor.isActive("heading", { level: 3 })) return "\uC81C\uBAA9 3";
    return "\uBCF8\uBB38";
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    import_menus.BubbleMenu,
    {
      editor,
      options: {
        placement: "top"
      },
      shouldShow: ({ editor: e, state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;
        if (e.isActive("codeBlock")) return false;
        if (e.isActive("image")) return false;
        return true;
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex items-center gap-0.5 px-1.5 py-1 bg-foreground rounded-lg shadow-xl", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => setShowHeadings(!showHeadings),
              className: "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Type, { size: 12 }),
                getCurrentBlockLabel()
              ]
            }
          ),
          showHeadings && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "absolute bottom-full left-0 mb-1 bg-foreground rounded-lg shadow-xl border border-white/10 py-1 min-w-[120px]", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
              "button",
              {
                type: "button",
                className: cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  !editor.isActive("heading") ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"
                ),
                onClick: () => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadings(false);
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Type, { size: 12 }),
                  " \uBCF8\uBB38"
                ]
              }
            ),
            [1, 2, 3].map((level) => {
              const Icon = level === 1 ? import_lucide_react6.Heading1 : level === 2 ? import_lucide_react6.Heading2 : import_lucide_react6.Heading3;
              return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
                "button",
                {
                  type: "button",
                  className: cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    editor.isActive("heading", { level }) ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"
                  ),
                  onClick: () => {
                    editor.chain().focus().toggleHeading({ level }).run();
                    setShowHeadings(false);
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Icon, { size: 12 }),
                    " \uC81C\uBAA9 ",
                    level
                  ]
                },
                level
              );
            })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(BubbleDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().toggleBold().run(),
            active: editor.isActive("bold"),
            title: "\uAD75\uAC8C",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Bold, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().toggleItalic().run(),
            active: editor.isActive("italic"),
            title: "\uAE30\uC6B8\uC784",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Italic, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().toggleUnderline().run(),
            active: editor.isActive("underline"),
            title: "\uBC11\uC904",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Underline, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().toggleStrike().run(),
            active: editor.isActive("strike"),
            title: "\uCDE8\uC18C\uC120",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Strikethrough, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().toggleHighlight().run(),
            active: editor.isActive("highlight"),
            title: "\uD558\uC774\uB77C\uC774\uD2B8",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.Highlighter, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(BubbleDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: addLink,
            active: editor.isActive("link"),
            title: "\uB9C1\uD06C",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.LinkIcon, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(BubbleDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().setTextAlign("left").run(),
            active: editor.isActive({ textAlign: "left" }),
            title: "\uC67C\uCABD \uC815\uB82C",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.AlignLeft, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().setTextAlign("center").run(),
            active: editor.isActive({ textAlign: "center" }),
            title: "\uAC00\uC6B4\uB370 \uC815\uB82C",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.AlignCenter, { size: iconSize })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          BubbleButton,
          {
            onClick: () => editor.chain().focus().setTextAlign("right").run(),
            active: editor.isActive({ textAlign: "right" }),
            title: "\uC624\uB978\uCABD \uC815\uB82C",
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react6.AlignRight, { size: iconSize })
          }
        )
      ] })
    }
  );
}

// src/components/BlockHandle.tsx
function BlockHandle(_props) {
  return null;
}

// src/components/PdfViewer.tsx
var import_react11 = require("react");
var import_lucide_react7 = require("lucide-react");
var import_jsx_runtime8 = require("react/jsx-runtime");
function PdfViewer({ src, fileName }) {
  const canvasRef = (0, import_react11.useRef)(null);
  const containerRef = (0, import_react11.useRef)(null);
  const [pdf, setPdf] = (0, import_react11.useState)(null);
  const [page, setPage] = (0, import_react11.useState)(1);
  const [total, setTotal] = (0, import_react11.useState)(0);
  const [loading2, setLoading] = (0, import_react11.useState)(true);
  const [error, setError] = (0, import_react11.useState)(false);
  (0, import_react11.useEffect)(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        setLoading(true);
        setError(false);
        setPdf(null);
        setPage(1);
        const pdfjsLib = await getPdfJs();
        const loadingTask = pdfjsLib.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (!cancelled) {
          setPdf(pdfDoc);
          setTotal(pdfDoc.numPages);
          setLoading(false);
        }
      } catch (e) {
        console.error("[PdfViewer] PDF \uB85C\uB4DC \uC2E4\uD328:", src, e);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [src]);
  const renderingRef = (0, import_react11.useRef)(false);
  const renderPage = (0, import_react11.useCallback)(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    try {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pageObj = await pdf.getPage(page);
      const unscaledViewport = pageObj.getViewport({ scale: 1 });
      const availableWidth = container.clientWidth - 32;
      if (availableWidth <= 0) return;
      const scale = availableWidth / unscaledViewport.width;
      const viewport = pageObj.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      await pageObj.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      renderingRef.current = false;
    }
  }, [pdf, page]);
  (0, import_react11.useEffect)(() => {
    renderPage();
  }, [renderPage]);
  (0, import_react11.useEffect)(() => {
    if (!pdf) return;
    let timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(renderPage, 100);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pdf, renderPage]);
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "border border-border rounded-lg p-4 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-sm text-muted-foreground", children: "PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("a", { href: src, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-primary hover:underline", children: "\uC9C1\uC811 \uB2E4\uC6B4\uB85C\uB4DC" })
    ] });
  }
  if (loading2) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "border border-border rounded-lg p-8 text-center", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-sm text-muted-foreground animate-pulse", children: "PDF \uB85C\uB529 \uC911..." }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "border border-border rounded-lg overflow-hidden bg-muted/30 my-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center justify-between px-4 py-2 border-b border-border bg-background", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "text-xs text-muted-foreground truncate", children: fileName || "PDF \uBB38\uC11C" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
        page,
        " / ",
        total
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { ref: containerRef, className: "flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("canvas", { ref: canvasRef, className: "shadow-sm" }) }),
    total > 1 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-background", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setPage((p) => Math.max(1, p - 1)),
          disabled: page <= 1,
          className: "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30",
          title: "\uC774\uC804 \uD398\uC774\uC9C0",
          children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react7.ChevronLeft, { className: "w-4 h-4" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "text-sm tabular-nums", children: [
        page,
        " / ",
        total
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setPage((p) => Math.min(total, p + 1)),
          disabled: page >= total,
          className: "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30",
          title: "\uB2E4\uC74C \uD398\uC774\uC9C0",
          children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react7.ChevronRight, { className: "w-4 h-4" })
        }
      )
    ] })
  ] });
}

// src/utils/escape-html.ts
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/utils/sanitize.ts
var ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "b",
  "i",
  "u",
  "em",
  "strong",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "img",
  "figure",
  "figcaption",
  "table",
  "colgroup",
  "col",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "div",
  "hr",
  "sub",
  "sup"
]);
var ALLOWED_ATTRS = {
  a: /* @__PURE__ */ new Set(["href", "title", "target", "rel"]),
  img: /* @__PURE__ */ new Set(["src", "alt", "width", "height"]),
  table: /* @__PURE__ */ new Set(["style"]),
  col: /* @__PURE__ */ new Set(["style", "width"]),
  td: /* @__PURE__ */ new Set(["colspan", "rowspan", "colwidth", "style"]),
  th: /* @__PURE__ */ new Set(["colspan", "rowspan", "colwidth", "style"]),
  div: /* @__PURE__ */ new Set(["data-pdf-src", "data-pdf-name"]),
  pre: /* @__PURE__ */ new Set(["class"]),
  code: /* @__PURE__ */ new Set(["class"]),
  "*": /* @__PURE__ */ new Set(["class", "id"])
};
var SAFE_URL_PATTERN = /^(?:https?:\/\/|\/[\w])/i;
function sanitizeHtml(html) {
  return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag, attrs) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";
    const cleanAttrs = sanitizeAttributes(lower, attrs);
    const isClosing = match.startsWith("</");
    if (isClosing) return `</${lower}>`;
    const selfClosing = match.endsWith("/>");
    return `<${lower}${cleanAttrs}${selfClosing ? " /" : ""}>`;
  });
}
function sanitizeAttributes(tag, attrString) {
  const allowedForTag = ALLOWED_ATTRS[tag] ?? /* @__PURE__ */ new Set();
  const allowedGlobal = ALLOWED_ATTRS["*"] ?? /* @__PURE__ */ new Set();
  const result = [];
  const attrRegex = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m;
  while ((m = attrRegex.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (name.startsWith("on")) continue;
    if (!allowedForTag.has(name) && !allowedGlobal.has(name)) continue;
    if ((name === "href" || name === "src") && !SAFE_URL_PATTERN.test(value)) {
      continue;
    }
    result.push(` ${name}="${escapeHtml(value)}"`);
  }
  return result.join("");
}
function stripHtmlToExcerpt(html, maxLen = 200) {
  const text = String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "\u2026" : text;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BlockHandle,
  BubbleToolbar,
  FixedToolbar,
  InputModal,
  PdfBlock,
  PdfViewer,
  SLASH_MENU_ITEMS,
  SlashCommandMenu,
  TableBubbleMenu,
  TipTapEditor,
  cn,
  configurePdfJs,
  getPdfJs,
  sanitizeHtml,
  stripHtmlToExcerpt
});
//# sourceMappingURL=index.cjs.map