/**
 * 离屏的 Canvas,我们通过 canvas 绘制真正的首屏相关的内容,减少代码量
 */

const { windowWidth, windowHeight, pixelRatio} = wx.getSystemInfoSync();
 let mCanvas;
 let mCtx; 
 let mTexture;          // 用于存储离屏渲染内容的纹理
 let mWebGL;            // webGL
 let mBgImage;          // 背景图片
 let mLoadingBarImage;  // 进度条图片

/**
 * 初始化资源加载
 * @param gl 使用的 webgl
 * @returns 返回包含离屏的纹理
 */
function init(gl){    
    // 创建离屏 Canvas
    mCanvas = wx.createCanvas();    
    mCanvas.width = windowWidth;//*pixelRatio;
    mCanvas.height = windowHeight;//*pixelRatio;
    mCtx = mCanvas.getContext('2d');      // 获取离屏的 canvas

    mBgImage = wx.createImage();          // 背景图片
    mLoadingBarImage = wx.createImage();  // 进度条背景图片
    const bgImageLoading = loadImage(mBgImage, "first_package/images/first_flash.jpg");
    const loadingBarImageLoading = loadImage(mLoadingBarImage, "first_package/images/loading_bar.png");

    mWebGL = gl;
    
    return Promise.all([bgImageLoading, loadingBarImageLoading]).then(function(){
        // 创建离屏使用的纹理
        mTexture = gl.createTexture();
        gl.bindTexture(mWebGL.TEXTURE_2D, mTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // 绘制一帧
        drawScene();        
        return mTexture;    // 返回当前使用的纹理
    })
}

/**
 * 绘制场景的函数
 * @param loadingBarProgress 当前进度条进度
 */
function drawScene (loadingBarProgress){
    // 清除屏幕
    mCtx.clearRect(0, 0, windowWidth, windowHeight)
    
    { // 距中显示背景
        // 计算背景的缩放比
        const widthScale = windowWidth/mBgImage.width;
        const heightScale = windowHeight/mBgImage.height;
        const bgScale = Math.max(widthScale, heightScale);
        const width = mBgImage.width*bgScale;
        const height = mBgImage.height*bgScale;
        // 绘制背景
        mCtx.drawImage(mBgImage, (windowWidth - width)*0.5, (windowHeight - height)*0.5, width, height);
    }

    // mCtx.setFontSize(30);
    mCtx.fillStyle = '#FFA500';
    mCtx.font = "30px serif";
    mCtx.fillText("测试一下字体", 100, 100);

    // 更新离屏纹理内容
    mWebGL.bindTexture(mWebGL.TEXTURE_2D, mTexture);
    mWebGL.texImage2D(mWebGL.TEXTURE_2D, 0, mWebGL.RGB, mWebGL.RGB, mWebGL.UNSIGNED_BYTE, mCanvas);
    mWebGL.bindTexture(mWebGL.TEXTURE_2D, null);
}

/**
 * 加载指定的图片资源
 * @param {*} image 
 * @param {*} url 
 */
function loadImage(image, url){
    return new Promise(function(resolve, _){
        image.onload = function(){
        resolve(image);      
        }

        image.src = url;
    });
}

/**
 * 释放占用的资源
 */
function release(){
    mWebGL.bindTexture(mWebGL.TEXTURE_2D, null);
    mWebGL.deleteTexture(mTexture);
    mTexture = undefined;
	mCtx = undefined;
    mWebGL = undefined;    
    mBgImage.src = "";
    mBgImage = undefined;
    mLoadingBarImage.src = "";
    mLoadingBarImage = undefined;
    mCanvas = undefined;
}

exports.init = init;
exports.release = release;
exports.drawScene = drawScene;