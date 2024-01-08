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
    const vsSourcePoints = `
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

    const fsSourcePoints = `
    precision mediump float;

    varying vec4 v_color;
    
    void main() {
        gl_FragColor = v_color;
    }
    `;

    const vsSourceLines = `
    attribute vec4 a_position;
    attribute vec4 a_color;

    varying vec4 v_color;

    uniform mat4 u_world2ScreenMatrix;
    uniform mat4 u_rotationMatrix;

    void main() {
        gl_Position = u_world2ScreenMatrix * u_rotationMatrix * a_position;
        v_color = a_color;
    }
    `;

    const fsSourceLines = `
    precision mediump float;

    varying vec4 v_color;
    
    void main() {
        gl_FragColor = v_color;
    }
    `;

    // Setup GLSL program
    const programPoints = createProgram(gl, vsSourcePoints, fsSourcePoints);
    const programLines = createProgram(gl, vsSourceLines, fsSourceLines);

    // Look up vertex data locations
    const positionLocationPoints = gl.getAttribLocation(programPoints, 'a_position');
    const colorLocationPoints = gl.getAttribLocation(programPoints, 'a_color');
    const sizeLocationPoints = gl.getAttribLocation(programPoints, 'a_pointSize');

    const positionLocationLines = gl.getAttribLocation(programLines, 'a_position');
    const colorLocationLines = gl.getAttribLocation(programLines, 'a_color');
    const sizeLocationLines = gl.getAttribLocation(programLines, 'a_pointSize');


    // Look up uniform locations
    const world2ScreenMatrixLocationPoints = gl.getUniformLocation(programPoints, 'u_world2ScreenMatrix');
    const rotationMatrixLocationPoints = gl.getUniformLocation(programPoints, 'u_rotationMatrix');

    const world2ScreenMatrixLocationLines = gl.getUniformLocation(programLines, 'u_world2ScreenMatrix');
    const rotationMatrixLocationLines = gl.getUniformLocation(programLines, 'u_rotationMatrix');

    // Set up buffer with position data
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
        250, 0, 0, // x positive
        -250, 0, 0, // x negative
        0, 250, 0, // y positive
        0, -250, 0, // y negative
        0, 0, 250, // z positive
        0, 0, -250, // z negative
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    // Set up buffer with color data
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    const colors = new Float32Array([
        1, 0, 0, 1,
        0.5, 0, 0, 1,
        0, 1, 0, 1,
        0, 0.5, 0, 1,
        0, 0, 1, 1,
        0, 0, 0.5, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);


    // Set up buffers with point sizes
    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    const sizes = new Float32Array([
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


        // draw points
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocationPoints, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocationPoints);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocationPoints, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLocationPoints);

        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.vertexAttribPointer(sizeLocationPoints, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sizeLocationPoints);

        gl.useProgram(programPoints);

        gl.uniformMatrix4fv(world2ScreenMatrixLocationPoints, false, new Float32Array([1 / 500, 0, 0, 0, 0, 1 / 500, 0, 0, 0, 0, 1 / 1000, 0, 0, 0, 0, 1]));

        const rotationMatrix = mat4.create();
        mat4.rotateX(rotationMatrix, rotationMatrix, degToRad(rotate.x));
        mat4.rotateY(rotationMatrix, rotationMatrix, degToRad(rotate.y));
        mat4.rotateZ(rotationMatrix, rotationMatrix, degToRad(rotate.z));
        gl.uniformMatrix4fv(rotationMatrixLocationPoints, false, rotationMatrix);

        gl.drawArrays(gl.POINTS, 0, 6);

        // draw lines

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocationLines, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocationLines);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocationLines, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLocationLines);

        gl.useProgram(programLines);

        gl.uniformMatrix4fv(world2ScreenMatrixLocationLines, false, new Float32Array([1 / 500, 0, 0, 0, 0, 1 / 500, 0, 0, 0, 0, 1 / 1000, 0, 0, 0, 0, 1]));
        gl.uniformMatrix4fv(rotationMatrixLocationLines, false, rotationMatrix);

        gl.drawArrays(gl.LINES, 0, 6);

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