import * as twgl from 'twgl.js';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import Camera from '@arcgis/core/Camera';
import Point from '@arcgis/core/geometry/Point';
import * as externalRenderers from '@arcgis/core/views/3d/externalRenderers';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import { mat4 } from 'gl-matrix';

let view: SceneView;

function main() {

    view = new SceneView({
        container: "viewDiv",
        map: new Map({
            basemap: "hybrid",
            ground: "world-elevation"
        }),

        camera: {
            position: {
                x: -12977859.07,
                y: 4016696.94,
                z: 348.61,
                spatialReference: { wkid: 102100 }
            },
            heading: 316,
            tilt: 85
        },
        viewingMode: "local",

        qualityProfile: "high",

        environment: {
            atmosphere: {
                quality: "high"
            },

            lighting: {
                directShadowsEnabled: true
            }
        },
    });

    view.when(() => {
        const renderer = new ExternalRenderer(view);
        externalRenderers.add(view, renderer);
    });

    (window as any).view = view;

}

class ExternalRenderer {

    // Shader attribute and uniform locations
    programAttribVertexPosition: ArrayBuffer = null;
    programAttribVertexColor: ArrayBuffer = null;
    vboPositions: WebGLBuffer = null;
    vboColor: WebGLBuffer = null;
    ibo: WebGLBuffer = null;
    programUniformProjectionMatrix: ArrayBuffer = null;
    programUniformModelViewMatrix: mat4 = null;
    tempMatrix4: Float32Array = new Float32Array(16);
    program: WebGLProgram = null;
    view: SceneView = null;
    // local origin x,y,z -> the cube will draw relative to this
    localOrigin: Float32Array = new Float32Array([
        - 12978278.649445374, 4017013.2729685362, 310.0
    ]);
    localOriginSR: __esri.SpatialReference = SpatialReference.WebMercator;
    localOriginRender: any = null;
    inputToRender: any = null;

    constructor(private view2: SceneView) {
        this.view = view2;
    }

    setup(context: __esri.RenderContext) {
        this.initShaders(context);
        this.initData(context);
    }

    render(context: __esri.RenderContext) {
        // time since application started, in miliseconds
        const time = performance.now();
        const { gl, camera } = context;

        // Set some global WebGL state
        // State will be reset between each render() call
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.vertexAttribPointer(this.programAttribVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.vertexAttribPointer(this.programAttribVertexColor, 3, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexColor);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

        gl.uniformMatrix4fv(
            this.programUniformProjectionMatrix,
            false,
            context.camera.projectionMatrix
        );

        mat4.identity(this.tempMatrix4);
        const angle = degToRad((time / 10) % 360);
        const x = Math.cos(angle) * 20;
        const y = Math.sin(angle) * 20;
        const translation = new Float32Array([this.localOriginRender[0] + x, this.localOriginRender[1] + y, this.localOriginRender[2]]);
        console.log(translation);
        mat4.translate(this.tempMatrix4, this.tempMatrix4, translation);
        mat4.rotateZ(this.tempMatrix4, this.tempMatrix4, angle);
        const scaleFactor = Math.sin(angle) * 0.5 + 1;
        mat4.scale(this.tempMatrix4, this.tempMatrix4, [scaleFactor, scaleFactor, scaleFactor]);
        mat4.multiply(this.tempMatrix4, camera.viewMatrix, this.tempMatrix4);
        gl.uniformMatrix4fv(
            this.programUniformModelViewMatrix,
            false,
            this.tempMatrix4
        );

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        externalRenderers.requestRender(this.view);
    }

    initShaders(context: __esri.RenderContext) {
        const gl = context.gl;

        // Initialize shaders
        const vsSource = `
            attribute vec4 a_position;
            attribute vec4 a_color;
            uniform mat4 u_projectionMatrix;
            uniform mat4 u_modelViewMatrix;

            varying vec4 v_color;

            void main() {
                gl_Position = u_projectionMatrix * u_modelViewMatrix * a_position;
                v_color = a_color;
            }
        `;

        const fsSource = `
            precision mediump float;
            varying vec4 v_color;    
            void main() {
                gl_FragColor = v_color;
            }
        `;

        // Setup GLSL program
        this.program = createProgram(gl, vsSource, fsSource);
        if (!this.program) {
            alert("Could not initialize shaders");
        }

        // Program attributes
        this.programAttribVertexPosition = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(this.programAttribVertexPosition);
        this.programAttribVertexColor = gl.getAttribLocation(this.program, 'a_color');
        gl.enableVertexAttribArray(this.programAttribVertexColor);
        // Program uniforms
        this.programUniformProjectionMatrix = gl.getUniformLocation(this.program, "u_projectionMatrix");
        this.programUniformModelViewMatrix = gl.getUniformLocation(this.program, "u_modelViewMatrix");

    }

    initData(context: __esri.RenderContext) {
        const gl = context.gl;

        const { positions, colors, indices } = createCubeVertices(10);

        this.programAttribVertexPosition = gl.getAttribLocation(this.program, "a_position");
        this.vboPositions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.programAttribVertexColor = gl.getAttribLocation(this.program, "a_color");
        this.vboColor = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

        this.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.localOriginRender = externalRenderers.toRenderCoordinates(
            view,
            this.localOrigin,
            0,
            this.localOriginSR,
            new Float32Array(3),
            0,
            1
        );

    }

}

function createCubeVertices(size: number) {
    const k = size / 2;
    const positions = new Float32Array([
        k, -k, k, // 0
        k, k, k, // 1
        -k, k, k,   // 2
        -k, -k, k, // 3
        k, -k, -k, // 4
        k, k, -k,   // 5
        -k, k, -k,  // 6
        -k, -k, -k  // 7
    ]);
    const colors = new Uint8Array([
        255, 0, 0, // 0
        0, 0, 255, // 1
        0, 0, 255, // 2
        255, 0, 0, // 3
        255, 0, 0, // 4
        0, 0, 255, // 5
        0, 0, 255, // 6
        255, 0, 0 // 7
    ]);
    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3,
        0, 5, 1,
        0, 4, 5,
        0, 7, 4,
        0, 3, 7,
        4, 6, 5,
        4, 7, 6,
        1, 5, 6,
        1, 6, 2,
        3, 6, 7,
        3, 2, 6
    ]);
    return { positions, colors, indices };

}

main();


/**
 * Helper functions
 */


/**
 * Creates and compiles shaders from a string source.
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext to use.
 * @param {string} src The shader source.
 * @param {number} shaderType The type of shader.
 * @returns {WebGLShader} The shader.
 */
function createShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compiling shader: " + gl.getShaderInfoLog(shader));
        return;
    }
    return shader;
}

/**
 * Creates a program, attaches shaders.
 * @param {WebGLRenderingContext} gl The rendering context
 * @param {string} vsSource The vertex shader source
 * @param {string} fsSource The fragment shader source
 * @returns {WebGLProgram} The program
 */
function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
        console.error('Failed to create program');
    }
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    gl.attachShader(program, vertexShader);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error('Failed to link program: ' + gl.getProgramInfoLog(program));
    }
    return program;
}

/**
 * Resize a canvas to match the size its displayed.
 * @param {HTMLCanvasElement} canvas The canvas to resize.
 */
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    const width = canvas.clientWidth | 0;
    const height = canvas.clientHeight | 0;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    return { width, height };
}


function degToRad(d: number) {
    return d * Math.PI / 180;
}