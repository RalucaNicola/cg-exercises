import * as twgl from 'twgl.js';


function main() {
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
    uniform float u_time;
    
    void main() {
        gl_FragColor = vec4(sin(u_time) * v_Color[0], cos(u_time) * v_Color[1], v_Color[2], 255.0);
    }
    `;

    // Setup GLSL program
    const program = createProgram(gl, vsSource, fsSource);
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

    const vertices = new Float32Array([
        -0.5, 0.5, 0.0,
        -0.5, -0.5, 0.0,
        0.5, 0.5, 0.0,
        0.5, -0.5, 0.0,
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
        200, 70, 120,
        80, 70, 200,
        70, 200, 210,
        200, 70, 120,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.vertexAttribPointer(colorLocation, dim, gl.UNSIGNED_BYTE, true, 0, 0);

    gl.enableVertexAttribArray(colorLocation);

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

        const currentTime = performance.now() / 1000;
        gl.uniform1f(timeLocation, currentTime);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    document.getElementById('angleSlider').addEventListener('input', function (this: HTMLInputElement) {
        cameraAngle = degToRad(parseInt(this.value));
    });
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