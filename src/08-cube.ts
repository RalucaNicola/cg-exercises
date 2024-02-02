import { mat4 } from 'gl-matrix';
import GUI from 'lil-gui';


// matrix parameters
const scale = {
    x: 1,
    y: 1,
    z: 1
}
const rotate = {
    x: 0,
    y: 0,
    z: 0
}
const translate = {
    x: 0,
    y: 0,
    z: -1
}
const projection = {
    fov: 45,
    near: 0.1,
    far: 100
}


function setUpGUI() {

    const gui = new GUI();

    const scaleFolder = gui.addFolder('Scale');

    scaleFolder.add(scale, "x", 0, 10, 0.1);
    scaleFolder.add(scale, "y", 0, 10, 0.1);
    scaleFolder.add(scale, "z", 0, 10, 0.1);

    const rotationFolder = gui.addFolder('Rotation');

    rotationFolder.add(rotate, "x", -180, 180, 1);
    rotationFolder.add(rotate, "y", -180, 180, 1);
    rotationFolder.add(rotate, "z", -180, 180, 1);

    const translationFolder = gui.addFolder('Translation');

    translationFolder.add(translate, "x", -10, 10, 0.1);
    translationFolder.add(translate, "y", -10, 10, 0.1);
    translationFolder.add(translate, "z", -10, 10, 0.1);

    const projectionFolder = gui.addFolder('Projection');


    projectionFolder.add(projection, "fov", 0, 180, 1);
    projectionFolder.add(projection, "near", 0, 10, 0.1);
    projectionFolder.add(projection, "far", 0, 100, 0.1);

}

// UI sliders to configure matrix parameters
setUpGUI();

function main() {

    /* Initialization */

    // Get a WebGL context
    const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

    const gl = canvas.getContext('webgl2') as WebGLRenderingContext;
    if (!gl) {
        console.error('WebGL not supported');
    }

    // Initialize shaders
    const vsSource = `#version 300 es
    in vec4 a_position;
    in vec4 a_color;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;

    out vec4 v_color;

    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_position;
        v_color = a_color;
    }
    `;

    const fsSource = `#version 300 es
    precision mediump float;

    in vec4 v_color;
    out vec4 fragColor;
    
    void main() {
        fragColor = v_color;
    }
    `;

    // Setup GLSL program
    const program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    // Look up vertex data locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getAttribLocation(program, 'a_color');

    // Look up uniform locations
    const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
    const uViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
    const uProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");

    const { positions, colors, indices } = createCubeVertices(10);

    // Create a buffer for the positions
    const positionBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Create a buffer for the colors
    const colorBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

    // Create a buffer for the indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    /* Render the scene */
    function drawScene() {
        const { width, height } = resizeCanvasToDisplaySize(canvas);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything

        // tell webgl to cull faces
        gl.enable(gl.CULL_FACE);

        // turn on depth testing
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.enableVertexAttribArray(colorLocation);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // Compute model matrix
        const modelMatrix = mat4.create();
        mat4.scale(modelMatrix, modelMatrix, [0.05, 0.05, 0.05]);

        gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

        // Compute view matrix
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix, viewMatrix, [translate.x, translate.y, translate.z]);
        mat4.rotateX(viewMatrix, viewMatrix, degToRad(rotate.x));
        mat4.rotateY(viewMatrix, viewMatrix, degToRad(rotate.y));
        mat4.rotateZ(viewMatrix, viewMatrix, degToRad(rotate.z));
        mat4.scale(viewMatrix, viewMatrix, [scale.x, scale.y, scale.z]);

        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);

        // Compute projection matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, degToRad(projection.fov), width / height, projection.near, projection.far);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    window.requestAnimationFrame(function renderLoop() {
        drawScene();
        window.requestAnimationFrame(renderLoop);
    });
}

main();


/**
 * Helper functions
 */


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