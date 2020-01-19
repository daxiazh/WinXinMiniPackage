const { windowWidth, windowHeight } = wx.getSystemInfoSync();
wx.setPreferredFramesPerSecond(10); // 10足够了,不需要更高的帧率,因为开始时我们主要是在加载资源.

// 保存子包下载的进度信息
let subpackageLoadingInfo = {
  progress: 0,
  totalBytesWritten: 0,
  totalBytesExpectedToWrite: 0
};

_main_();

/**
 * 目前用于快速显示首屏,放在主包中执行的函数
 */
function _main_() {
  let errLog = "";  // 用来存储错误日志

  // 先加载首屏背景纹理,因为它是异步加载的,加载过程中可以同步做后面的初始化工作
  const bgImageLoading = loadImage("first_package_images/first_flash.jpg");
  
  // 显示首屏背景纹理的 Vertex Shader
  const vsSource = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;

    varying highp vec2 vTextureCoord;

    void main(void){
      gl_Position = vec4(aVertexPosition, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
  }
  `;

  // 显示首屏纹理的 Fragment Shader
  const fsSource = `
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main(void){
      gl_FragColor = texture2D(uSampler, vTextureCoord);
      // gl_FragColor = vec4(0, 0.8, 0, 1);
    }
  `;

  const canvas = wx.createCanvas();   // 创建画布
  screencanvas = initCanvas(canvas);              // 强制 cocos 引擎使用同一个 canvas
  var gl = canvas.getContext('webgl');// 获取 webgl

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if(shaderProgram == null){
    wx.showModal({
      title: '初始化首屏 Shader 失败',
      content: errLog,
    })
    return false;
  }

  // Collect all the info needed to use the shader program.
  // Look up which attributes out shader program is using
  // for aVertexPosition, aTextureCoord and also
  // look up uniform locations.
  let programInfo = {
    program: shaderProgram,
    attribLocations:{
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations:{
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
    },
  };

  // Here's where we call the routine that builds all the 
  // objects we'll be drawing
  let buffers;

  let firstFlashTexture = null;

  // 首屏图片加载完成后初始化 webgl 纹理
  bgImageLoading.then(function(image){
    // 加载首屏纹理
    firstFlashTexture = loadTexture(gl, image);
    buffers = initQuadBuffers(gl, image.width, image.height);
    image.src = ""; // 清除图片的内存占用
  });

  // 主循环函数,显示loading条
  function loop(){
    if(programInfo === null){
      return ; // 已经加载完成子包,不再需要此首屏渲染了
    }
    
    if(firstFlashTexture){
      drawScene(gl, programInfo, buffers, firstFlashTexture, 0);
    }    
    requestAnimationFrame(loop);
  }

  if(true){
  // 加载子包
  const loadSubPackagePromise = new Promise(function (resolve, reject){
    const loadTask = wx.loadSubpackage({
      name: 'stage1', // name 可以填 name 或者 root
      success: function (res) {
        // 分包加载成功后通过 success 回调
        resolve();
      },
      fail: function (res) {
        reject();
        // 分包加载失败通过 fail 回调
      }
    });
    
    loadTask.onProgressUpdate(res => {
      subpackageLoadingInfo = res;
      console.log('下载进度', res.progress)
      console.log('已经下载的数据长度', res.totalBytesWritten)
      console.log('预期需要下载的数据总长度', res.totalBytesExpectedToWrite)
    });  
  })

  // 等待子包的加载
  loadSubPackagePromise.then(function(){
    // 释放占用的资源
    //gl.deleteProgram(programInfo.program);
    //firstFlashTexture && gl.deleteTexture(firstFlashTexture);
    programInfo = null;
    buffers = null;
    wx.setPreferredFramesPerSecond(60); // 恢复60帧,因为要开始游戏的内容渲染了    
  });
}
  
  // 开始主循环
  requestAnimationFrame(loop);
  return true;
}

// ------------------------ 下面是封装的函数 ---------------------------------

/**
 * 按照 cocos 的方式来填充一些函数,具体见: stage1\libs\weapp-adapter\Canvas.js 文件与 stage1\libs\weapp-adapter\HTMLCanvasElement.js:26 文件的实现
 * 要不在真机上运行不过,因为下面这些函数会被使用
 * @param {*} canvas 
 */
function initCanvas(canvas){
  canvas.type = 'canvas';

  canvas.getBoundingClientRect = function () {
    var ret = {
      top: 0,
      left: 0,
      width: windowWidth,
      height: windowHeight
    };
    return ret;
  };

  canvas.style = {
    top: '0px',
    left: '0px',
    width: windowWidth + 'px',
    height: windowHeight + 'px'
  };

  canvas.addEventListener = function (type, listener) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    // console.log('canvas.addEventListener', type);
    document.addEventListener(type, listener, options);
  };

  canvas.removeEventListener = function (type, listener) {
    // console.log('canvas.removeEventListener', type);
    document.removeEventListener(type, listener);
  };

  canvas.dispatchEvent = function () {
    var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    console.log('canvas.dispatchEvent', event.type, event);
    // nothing to do
  };

  Object.defineProperty(canvas, 'clientWidth', {
    enumerable: true,
    get: function get() {
      return windowWidth;
    }
  });

  Object.defineProperty(canvas, 'clientHeight', {
    enumerable: true,
    get: function get() {
      return windowHeight;
    }
  });

  return canvas;
}

/**
 * 根据传入的shader源码初始化 shader program
 */
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (vertexShader === null || fragmentShader === null) {
    return null;
  }

  // Create the shader program
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    errLog += gl.getProgramInfoLog(shaderProgram);
    console.error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}, (vs: ${vsSource})(ps: ${fsSource})`);
    gl.deleteProgram(shaderProgram);
    return null;
  }
  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    errLog += gl.getShaderInfoLog(shader);
    console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}, ${source} `);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * 初始化全屏矩形的 buffer
 * @param {Webgl} gl 
 */
function initQuadBuffers(gl, bgWidth, bgHeight){
  // Create a buffer for the rectangle's vertex positions.
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // 距中显示背景,计算坐标
  // 计算背景的缩放比
  const widthScale = windowWidth/bgWidth;
  const heightScale = windowHeight/bgHeight;
  const bgScale = Math.max(widthScale, heightScale);
  const width = bgWidth*bgScale;
  const height = bgHeight*bgScale;
  const x = width/windowWidth*2 - 1;  // 变换到投影坐标系
  const y = height/windowHeight*2 - 1;// 变换到投影坐标系
  
  // 创建全屏矩形的顶点坐标
  const positions = [
    -x, -y,
     x, -y,
     x,  y,
    -x,  y];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


  // 生成纹理坐标
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

  const textureCoordinates = [
    0.0, 1.0,    
    1.0, 1.0,
    1.0, 0.0,
    0.0, 0.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);


  // 生成索引缓冲
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // 顶点索引
  const indices = [
    0, 1, 2,  0, 2, 3
  ];

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
  }
}

/**
 * 根据传入的 image 来创建对应的纹理
 */
function loadTexture(gl, image){
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}

/**
 * 屏幕坐标()到投影坐标系
 */
function screenToProjectCoord(screenX, screenY){
  return [screenX/windowWidth*2.0 - 1.0, screenY/windowHeight*2.0 - 1.0];
}

/**
 * 加载指定的图片资源
 * @param {*} image 
 * @param {*} url 
 */
function loadImage(url) {
  return new Promise(function (resolve, _) {
    const image = wx.createImage();
    image.onload = function () {
      resolve(image);
    }

    image.src = url;
  });
}

/**
 * 绘制场景(首屏)
 * @param {*} gl 
 * @param {*} programInfo 
 * @param {*} buffers 
 * @param {*} texture 
 * @param {*} deltaTime 
 */
function drawScene(gl, programInfo, buffers, texture, deltaTime){
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.depthFunc(gl.LEQUAL);

  // 清除屏幕缓冲
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  {  // 设置位置缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }
  {  // 设置纹理缓冲
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  // 绑定 index 缓冲
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // 设置 shader
  gl.useProgram(programInfo.program);

  // 激活纹理0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  {  // 绘制全屏四边形
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
}