import GUI from 'lil-gui';
import { mat4 } from 'gl-matrix';

// rotation parameters
const rotate = {
    x: 0,
    y: 0,
    z: 0
}



function setUpGUI() {

    const gui = new GUI();
    const rotationFolder = gui.addFolder('Rotation');

    rotationFolder.add(rotate, "x", -180, 180, 1);
    rotationFolder.add(rotate, "y", -180, 180, 1);
    rotationFolder.add(rotate, "z", -180, 180, 1);

}

// UI sliders to configure matrix parameters
setUpGUI();

function main() {

    /* Initialization */

    // Get a WebGL context
    const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) {
        console.error('WebGL not supported');
    }

    // Initialize shaders
    const vsSource = `
    attribute vec4 a_position;
    attribute vec4 a_color;
    attribute float a_pointSize;

    varying vec4 v_color;

    uniform mat4 u_world2ScreenMatrix;
    uniform mat4 u_rotationMatrix;

    void main() {
        gl_Position = u_world2ScreenMatrix * u_rotationMatrix * a_position;
        gl_PointSize = a_pointSize;
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
    const program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    // Look up vertex data locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    const sizeLocation = gl.getAttribLocation(program, 'a_pointSize');

    // Look up uniform locations
    const world2ScreenMatrixLocation = gl.getUniformLocation(program, 'u_world2ScreenMatrix');
    const rotationMatrixLocation = gl.getUniformLocation(program, 'u_rotationMatrix');

    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
        0, 0, 0,
        250, 0, 0, // x positive
        -250, 0, 0, // x negative
        0, 250, 0, // y positive
        0, -250, 0, // y negative
        0, 0, 250, // z positive
        0, 0, -250, // z negative
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    // Create a buffer to put colors in
    const colorBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    const colors = new Float32Array([
        1, 1, 1, 0.5,
        1, 0, 0, 1,
        0.5, 0, 0, 1,
        0, 1, 0, 1,
        0, 0.5, 0, 1,
        0, 0, 1, 1,
        0, 0, 0.5, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    const sizes = new Float32Array([
        10,
        40,
        20,
        40,
        20,
        40,
        20
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);


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
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sizeLocation);

        gl.uniformMatrix4fv(world2ScreenMatrixLocation, false, new Float32Array([1 / 500, 0, 0, 0, 0, 1 / 500, 0, 0, 0, 0, 1 / 1000, 0, 0, 0, 0, 1]));

        const rotationMatrix = mat4.create();
        mat4.rotateX(rotationMatrix, rotationMatrix, degToRad(rotate.x));
        mat4.rotateY(rotationMatrix, rotationMatrix, degToRad(rotate.y));
        mat4.rotateZ(rotationMatrix, rotationMatrix, degToRad(rotate.z));
        gl.uniformMatrix4fv(rotationMatrixLocation, false, rotationMatrix);

        gl.drawArrays(gl.POINTS, 0, 7);
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