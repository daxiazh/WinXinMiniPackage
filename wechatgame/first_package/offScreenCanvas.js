"use strict";

/**
 * 离屏的 Canvas,我们通过 canvas 绘制真正的首屏相关的内容,减少代码量
 */

const { windowWidth, windowHeight, pixelRatio} = wx.getSystemInfoSync();
let mCanvas;
let mCtx; 
let mTexture;           // 用于存储离屏渲染内容的纹理
let mWebGL;             // webGL
let mBgImage;           // 背景图片
let mLoadingBarImage;   // 进度条图片

/**
 * 初始化资源加载
 * @param gl 使用的 webgl
 * @returns 返回包含离屏的纹理
 */
function init(gl){
    // 创建离屏 Canvas
    mCanvas = wx.createCanvas();    
    mCanvas.width = windowWidth;//*pixelRatio;  // pixelRatio 用来考虑高清屏,但这么高的分辨率会导致性能及内存占用问题,暂时屏蔽了
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
        drawScene(0);
        return mTexture;    // 返回当前使用的纹理
    })
}

let mLoadingTextIndex = 0;  // 存储显示点数

/**
 * 绘制场景的函数
 * @param loadingBarProgress 当前进度条进度
 * @param progressText 进度条的文本
 */
function drawScene (loadingBarProgress, progressText){
    // 清除屏幕
    mCtx.clearRect(0, 0, windowWidth, windowHeight)

    // 计算背景的缩放比    
    { // 距中显示背景
        const widthScale = windowWidth/mBgImage.width;
        const heightScale = windowHeight/mBgImage.height;
        const uniformScale = Math.max(widthScale, heightScale); // 选较大的缩放值来作为x,y的统一缩放,来保证缩放不变形
        const width = mBgImage.width*uniformScale;
        const height = mBgImage.height*uniformScale;
        // 绘制背景
        mCtx.drawImage(mBgImage, (windowWidth - width)*0.5, (windowHeight - height)*0.5, width, height);
    }

    const designWidth = 640;    // 设计分辨率
    const designHeight = 1136;  // 设计分辨率

    const widthScale = windowWidth/designWidth;
    const heightScale = windowHeight/designHeight;
    const uniformScale = Math.min(widthScale, heightScale); // 选较大的缩放值来作为x,y的统一缩放,来保证缩放不变形

    // 自动变换坐标系,绘制给定的image
    function drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh){
        mCtx.drawImage(image, sx, sy, sw, sh, dx*uniformScale, dy*uniformScale, dw*uniformScale, dh*uniformScale);
    }

    if(true){ // 显示进度条 // 注: 暂时屏蔽了进度条,因为在合包模式时,微信并不更新子包的下载进度,不知道为什么,可能是微信的Bug
        // 注: 下面的具体数值都是以设计分辨率为参考
        const scaledHeight = windowHeight/uniformScale; // 相对于底部的偏移量
        // 绘制进度条背景
        // drawImage(mLoadingBarImage, 0, 0, 480, 73,    73, scaledHeight - 215, 494, 83);    // 480,73 是进度条图片中的坐标,见 loading_bar.png; 其它数值见 LoadingSceneEle.prefab 中相关进度条的坐标
        // 进度条        
        // drawImage(mLoadingBarImage, 18, 74, 444 * loadingBarProgress, 36,  93, scaledHeight - 191, 452 * loadingBarProgress, 36);

        if(progressText){            
            mCtx.font = "20px serif";
            const addStr = [".", "..", "..."];
            const mt = mCtx.measureText(progressText);
            const text = progressText + addStr[(mLoadingTextIndex++)%addStr.length];
            const textPosX = (windowWidth - mt.width)/2;
            const textPosY = (scaledHeight - 100) * uniformScale;
            // mCtx.fillStyle = '#000000';
            // mCtx.fillText(text, textPosX + 2, textPosY + 2);            
            mCtx.fillStyle = '#FFFFFF';
            mCtx.fillText(text, textPosX, textPosY);
        }
    }

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