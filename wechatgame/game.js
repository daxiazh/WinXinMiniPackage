
_main_();

/**
 * 目前用于快速显示首屏,放在主包中执行的函数
 */
function _main_() {
  let errLog = "";  // 用来存储错误日志

  // 显示首屏纹理的 Vertex Shader
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
      // gl_FragColor = texture2D(uSampler, vTextureCoord);
      gl_FragColor = vec4(0, 0.8, 0, 1);
    }
  `;

  const canvas = wx.createCanvas();   // 创建画布
  var gl = canvas.getContext('webgl');// 获取 webgl

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if(shaderProgram == null){
    wx.showModal({
      title: '初始化首屏 Shader 失败',
      content: errLog,
    })
    return;
  }



  return ;
  // ------------------------ 下面是封装的函数 ---------------------------------


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
}
