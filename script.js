let gl, program;
let positionAttributeLocation, resolutionUniformLocation, timeUniformLocation, rotationUniformLocation, zoomUniformLocation;
let startTime;
let rotation = { x: 0, y: 0 };
let zoom = 1.0;
let isDragging = false;
let lastMousePosition = { x: 0, y: 0 };
let lastPinchDistance = 0;

async function main() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported, falling back on experimental-webgl');
        gl = canvas.getContext('experimental-webgl');
    }
    if (!gl) {
        console.error('Your browser does not support WebGL');
        return;
    }

    try {
        const vertexShaderSource = await loadShaderSource('vertex.glsl');
        const fragmentShaderSource = await loadShaderSource('fragment.glsl');

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }

        program = createProgram(gl, vertexShader, fragmentShader);

        if (!program) {
            console.error('Failed to create program');
            return;
        }

        positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
        timeUniformLocation = gl.getUniformLocation(program, 'u_time');
        rotationUniformLocation = gl.getUniformLocation(program, 'u_rotation');
        zoomUniformLocation = gl.getUniformLocation(program, 'u_zoom');

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        startTime = performance.now();

        // Add event listeners for touch and mouse events
        canvas.addEventListener('mousedown', startDragging);
        canvas.addEventListener('mousemove', drag);
        canvas.addEventListener('mouseup', stopDragging);
        canvas.addEventListener('mouseleave', stopDragging);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', stopDragging);
        canvas.addEventListener('wheel', handleWheel);

        requestAnimationFrame(render);
    } catch (error) {
        console.error('An error occurred during setup:', error);
    }
}

function startDragging(e) {
    isDragging = true;
    lastMousePosition = getEventPosition(e);
}

function stopDragging() {
    isDragging = false;
    lastPinchDistance = 0;
}

function drag(e) {
    if (!isDragging) return;
    
    const newPosition = getEventPosition(e);
    const deltaX = newPosition.x - lastMousePosition.x;
    const deltaY = newPosition.y - lastMousePosition.y;
    
    rotation.y += deltaX * 0.01;
    rotation.x += deltaY * 0.01;
    
    lastMousePosition = newPosition;
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        lastPinchDistance = getPinchDistance(e.touches);
    } else {
        startDragging(e);
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        const newPinchDistance = getPinchDistance(e.touches);
        const pinchDelta = newPinchDistance - lastPinchDistance;
        zoom *= 1 + pinchDelta * 0.01;
        zoom = Math.max(0.1, Math.min(zoom, 5.0));  // Clamp zoom between 0.1 and 5.0
        lastPinchDistance = newPinchDistance;
    } else {
        drag(e);
    }
}

function handleWheel(e) {
    e.preventDefault();
    zoom *= 1 - e.deltaY * 0.001;
    zoom = Math.max(0.1, Math.min(zoom, 5.0));  // Clamp zoom between 0.1 and 5.0
}

function getPinchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

function getEventPosition(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
        return { x: e.clientX, y: e.clientY };
    }
}

async function loadShaderSource(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Failed to load shader from ${url}:`, error);
        throw error;
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.error('Failed to compile shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.error('Failed to link program:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
}

function render(now) {
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, (now - startTime) * 0.001);
    gl.uniform2f(rotationUniformLocation, rotation.x, rotation.y);
    gl.uniform1f(zoomUniformLocation, zoom);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

window.onload = main;