import * as twgl from 'twgl.js';
import Map from '@arcgis/core/Map';
import SceneView from '@arcgis/core/views/SceneView';
import Camera from '@arcgis/core/Camera';
import Point from '@arcgis/core/geometry/Point';
import * as externalRenderers from '@arcgis/core/views/3d/externalRenderers';

let view: SceneView;

class ExternalRenderer {


    // Shader attribute and uniform locations
    programAttribVertexPosition: ArrayBuffer = null;
    programAttribVertexColor: ArrayBuffer = null;
    programUniformProjectionMatrix: ArrayBuffer = null;
    programUniformModelViewMatrix: ArrayBuffer = null;
    program: WebGLProgram = null;
    view: SceneView = null;
    localOrigin: Point = new Point({
        x: -12978323.50406812,
        y: 4017074.013392332,
        z: 292.77160461955384
    });

    constructor(private view2: SceneView) {
        this.view = view2;
    }
    setup(context: __esri.RenderContext) {
        this.initShaders(context);
    }
    render(context: __esri.RenderContext) {
        const gl = context.gl;

        // Set some global WebGL state
        // State will be reset between each render() call
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.useProgram(this.program);

        gl.uniformMatrix4fv(
            this.programUniformProjectionMatrix,
            false,
            context.camera.projectionMatrix
        );
    }

    initShaders(context: __esri.RenderContext) {
        const gl = context.gl;

        // Initialize shaders
        const vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    
    uniform mat4 u_matrix;

    varying vec4 v_Color;

    void main() {
        gl_Position = u_matrix * a_Position;
        v_Color = a_Color;
    }
    `;

        const fsSource = `
    precision mediump float;
    
    varying vec4 v_Color;
    
    void main() {
        gl_FragColor = v_Color;
    }
    `;

        // Setup GLSL program
        this.program = createProgram(gl, vsSource, fsSource);
        if (!this.program) {
            alert("Could not initialize shaders");
        }
        gl.useProgram(this.program);

        // Look up vertex data locations
        this.programAttribVertexPosition = gl.getAttribLocation(this.program, 'a_Position');
        gl.enableVertexAttribArray(this.programAttribVertexPosition);
        this.programAttribVertexColor = gl.getAttribLocation(this.program, 'a_Color');
        gl.enableVertexAttribArray(this.programAttribVertexColor);
        // Program uniforms
        this.programUniformProjectionMatrix = gl.getUniformLocation(this.program, "uProjectionMatrix");
        this.programUniformModelViewMatrix = gl.getUniformLocation(this.program, "uModelViewMatrix");

    }

    createVertexBuffer(gl: WebGL2RenderingContext, data: Array<number>) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        // We have filled vertex buffers in 64bit precision,
        // convert to a format compatible with WebGL
        const float32Data = new Float32Array(data);

        gl.bufferData(gl.ARRAY_BUFFER, float32Data, gl.STATIC_DRAW);
        return buffer;
    }

}

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

main();

function displayCube() {

    const dim = 3;
    // Get a WebGL context
    const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) {
        console.error('WebGL not supported');
    }

    // Initialize shaders
    const vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    
    uniform mat4 u_matrix;

    varying vec4 v_Color;

    void main() {
        gl_Position = u_matrix * a_Position;
        v_Color = a_Color;
    }
    `;

    const fsSource = `
    precision mediump float;
    
    varying vec4 v_Color;
    
    void main() {
        gl_FragColor = v_Color;
    }
    `;

    // Setup GLSL program
    const program = createProgram(gl, vsSource, fsSource);
    if (!program) {
        alert("Could not initialize shaders");
    }
    gl.useProgram(program);

    // Look up vertex data locations
    const positionLocation = gl.getAttribLocation(program, 'a_Position');
    const colorLocation = gl.getAttribLocation(program, 'a_Color');

    // Get uniform locations
    const matrixLocation = gl.getUniformLocation(program, "u_matrix");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // The vertices of a cube
    const vertices = new Float32Array([
        0.5, -0.5, 0.5, // 0
        -0.5, -0.5, 0.5, // 1
        -0.5, 0.5, 0.5, // 2
        0.5, 0.5, 0.5, // 3
        0.5, -0.5, -0.5, // 4
        0.5, 0.5, -0.5, // 5
        -0.5, 0.5, -0.5, // 6
        -0.5, -0.5, -0.5 // 7
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(positionLocation, dim, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Create a buffer to put colors in
    const colorBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //Put colors into buffer
    const colors = new Uint8Array([
        255, 0, 255,
        0, 0, 255,
        0, 255, 255,
        255, 255, 255,
        255, 0, 0,
        255, 255, 0,
        0, 255, 0,
        0, 0, 0
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.vertexAttribPointer(colorLocation, dim, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.enableVertexAttribArray(colorLocation);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3,
        0, 3, 5,
        0, 5, 4,
        0, 4, 1,
        1, 4, 7,
        1, 7, 6,
        1, 6, 2,
        2, 6, 3,
        3, 6, 5,
        4, 5, 6,
        4, 6, 7
    ]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    let cameraAngle: number = degToRad(0);

    function drawScene() {
        const { width, height } = resizeCanvasToDisplaySize(canvas);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything

        // tell webgl to cull faces
        // gl.enable(gl.CULL_FACE);

        // turn on depth testing
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Compute projection matrix
        const aspect = width / height;
        const zNear = 1;
        const zFar = -1;
        const projectionMatrix = twgl.m4.perspective(degToRad(60), aspect, zNear, zFar);

        // Compute a matrix for the camera
        let cameraMatrix = twgl.m4.rotationY(cameraAngle);
        cameraMatrix = twgl.m4.translate(cameraMatrix, [0, 0, 2]);
        const viewMatrix = twgl.m4.inverse(cameraMatrix);

        // Compute a view projection matrix
        const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

        gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }
    drawScene();
    document.getElementById('angleSlider').addEventListener('input', function (this: HTMLInputElement) {
        cameraAngle = degToRad(parseInt(this.value));
        drawScene();
    });
}


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
        alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
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