import SceneView from '@arcgis/core/views/SceneView';
import * as externalRenderers from '@arcgis/core/views/3d/externalRenderers';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import { mat4 } from 'gl-matrix';
import WebScene from '@arcgis/core/WebScene';

let view: SceneView;

function main() {

    view = new SceneView({
        container: "viewDiv",
        map: new WebScene({
            portalItem: {
                id: "9beec9328ca24cd0ae38b3657471d329"
            }
        }),

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
    programUniformProjectionMatrix: Float32Array = null;
    programUniformModelViewMatrix: Float32Array = null;
    tempMatrix4: Float32Array = new Float32Array(16);
    program: WebGLProgram = null;
    view: SceneView = null;
    // local origin x,y,z -> the cube will draw relative to this
    localOrigin: Float32Array = new Float32Array([
        950763.6511, 6002193.8497, 450
    ]);
    localOriginSR: __esri.SpatialReference = SpatialReference.WebMercator;
    localOriginRender: any = null;
    inputToRender: any = null;
    count: number = 1000;

    constructor(private view2: SceneView) {
        this.view = view2;
    }

    setup(context: __esri.RenderContext) {
        this.initShaders(context);
        this.initData(context);
    }

    render(context: __esri.RenderContext) {
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
        gl.vertexAttribPointer(this.programAttribVertexColor, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programAttribVertexColor);

        gl.uniformMatrix4fv(
            this.programUniformProjectionMatrix,
            false,
            context.camera.projectionMatrix
        );

        mat4.identity(this.tempMatrix4);
        mat4.translate(this.tempMatrix4, this.tempMatrix4, this.localOriginRender);
        mat4.multiply(this.tempMatrix4, camera.viewMatrix as Float32Array, this.tempMatrix4);
        gl.uniformMatrix4fv(
            this.programUniformModelViewMatrix,
            false,
            this.tempMatrix4
        );

        gl.drawArrays(gl.POINTS, 0, this.count);
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
                gl_PointSize = 10.0;
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

        const positions = getRandomPositions(this.count);
        const colors = getRandomColors(this.count);

        this.programAttribVertexPosition = gl.getAttribLocation(this.program, "a_position");
        this.vboPositions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPositions);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.programAttribVertexColor = gl.getAttribLocation(this.program, "a_color");
        this.vboColor = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboColor);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

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

function getRandomPositions(count: number) {
    const positions = [];
    for (let i = 0; i < count * 3; i++) {
        positions.push(Math.random() * 200 - 100);
    }
    return positions;
}

function getRandomColors(count: number) {
    const colors = [];
    for (let i = 0; i < count * 4; i += 4) {
        colors.push(Math.random());
        colors.push(Math.random());
        colors.push(Math.random());
        colors.push(1.0);
    }
    return colors;
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