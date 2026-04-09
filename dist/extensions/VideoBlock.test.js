import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { VideoBlock } from './VideoBlock';
describe('VideoBlock extension', () => {
    let editor;
    function createEditor(content = '<p></p>') {
        editor = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit, VideoBlock],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    it('registers with name "videoBlock"', () => {
        createEditor();
        const ext = editor.extensionManager.extensions.find((e) => e.name === 'videoBlock');
        expect(ext).toBeDefined();
    });
    it('parses <div data-video-src="url">', () => {
        createEditor('<div data-video-src="https://example.com/video.mp4" data-video-name="demo"></div>');
        const doc = editor.getJSON();
        const videoNode = doc.content?.find((n) => n.type === 'videoBlock');
        expect(videoNode).toBeDefined();
        expect(videoNode?.attrs?.src).toBe('https://example.com/video.mp4');
        expect(videoNode?.attrs?.name).toBe('demo');
    });
    it('renders correct HTML', () => {
        createEditor('<div data-video-src="https://example.com/video.mp4" data-video-name="demo"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-video-src="https://example.com/video.mp4"');
        expect(html).toContain('data-video-name="demo"');
    });
    it('defaults name to empty string', () => {
        createEditor('<div data-video-src="https://example.com/video.mp4"></div>');
        const doc = editor.getJSON();
        const videoNode = doc.content?.find((n) => n.type === 'videoBlock');
        expect(videoNode?.attrs?.name).toBe('');
    });
    it('inserts via setVideoBlock command', () => {
        createEditor();
        editor.commands.setVideoBlock({
            src: 'https://example.com/v.mp4',
            name: 'My Video'
        });
        const doc = editor.getJSON();
        const videoNode = doc.content?.find((n) => n.type === 'videoBlock');
        expect(videoNode).toBeDefined();
        expect(videoNode?.attrs?.src).toBe('https://example.com/v.mp4');
    });
});
