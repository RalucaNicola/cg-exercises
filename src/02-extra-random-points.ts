

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

    varying vec4 v_color;

    void main() {
        gl_Position = a_position;
        gl_PointSize = 5.0;
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

    const count = 1000;
    // Create a buffer to put positions in
    const positionBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array(getRandomPositions(count));
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    // Create a buffer to put colors in
    const colorBuffer = gl.createBuffer();
    // Bind it to array buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    const colors = new Float32Array(getRandomColors(count));
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    /* Render the scene */

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

    gl.drawArrays(gl.POINTS, 0, count);
}

main();

function getRandomPositions(count: number) {
    const positions = [];
    for (let i = 0; i < count * 3; i++) {
        positions.push(Math.random() * 2 - 1);
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