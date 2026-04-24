// package expo.modules.iminvicescreen

// import android.app.Presentation
// import android.content.Context
// import android.os.Bundle
// import android.view.Display
// import android.view.WindowManager
// import com.facebook.react.ReactRootView
// import com.facebook.react.ReactApplication

// class IminViceScreenPresentation(
//     context: Context,
//     display: Display,
//     private val moduleName: String
// ) : Presentation(context, display) {

//     override fun onCreate(savedInstanceState: Bundle?) {
//         super.onCreate(savedInstanceState)

//         // Lấy ReactInstanceManager từ expo
//         val reactApplication = context.applicationContext as com.facebook.react.ReactApplication
//         val reactInstanceManager = reactApplication.reactNativeHost.reactInstanceManager

//         // Tạo một RootView mới cho màn hình phụ
//         val rootView = ReactRootView(context)

//         // Khởi chạy component đã đăng ký trong AppRegistry
//         rootView.startReactApplication(reactInstanceManager, moduleName, null)

//         setContentView(rootView)
//     }
// }


// ---------------------------- v2 -----------------------------------

// package expo.modules.iminvicescreen

// import android.app.Presentation
// import android.content.Context
// import android.os.Bundle
// import android.view.Display
// import android.view.WindowManager
// import android.util.Log
// import com.facebook.react.ReactRootView
// import com.facebook.react.ReactApplication

// class IminViceScreenPresentation(
//     context: Context,
//     display: Display,
//     private val moduleName: String
// ) : Presentation(context, display) {

//     private var rootView: ReactRootView? = null

//     override fun onCreate(savedInstanceState: Bundle?) {
//         Log.d("IminViceScreen", "IminViceScreenPresentation onCreate started")
//         super.onCreate(savedInstanceState)

//         // 1. SỬA LỖI WINDOW TYPE: Khớp hoàn toàn với code Java
//         val win = window
//         if (win != null) {
//             val initialType = win.attributes.type
//             Log.d("IminViceScreen", "Initial Window Type: $initialType")

//             if (android.os.Build.VERSION.SDK_INT >= 32) {
//                 Log.d("IminViceScreen", "API >= 32: Skipping setType (current type: ${win.attributes.type})")
//             } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
//                 Log.d("IminViceScreen", "API O..S: Setting type to TYPE_APPLICATION_OVERLAY (2038)")
//                 win.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY)
//             } else {
//                 Log.d("IminViceScreen", "Legacy API: Setting type to TYPE_SYSTEM_OVERLAY")
//                 @Suppress("DEPRECATION")
//                 win.setType(WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY)
//             }
//             // Ngăn màn hình phụ chiếm Focus (tránh làm ẩn bàn phím ở màn hình chính)
//             win.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
//             Log.d("IminViceScreen", "Final Window Type: ${win.attributes.type}")
//         } else {
//             Log.e("IminViceScreen", "Window is null in onCreate!")
//         }

//         // 2. Lấy ReactInstanceManager an toàn
//         val reactApplication = context.applicationContext as? ReactApplication
//             ?: (context as? ReactApplication)
//             ?: throw Exception("Context must be a ReactApplication")
        
//         val reactInstanceManager = reactApplication.reactNativeHost.reactInstanceManager

//         // 3. Quản lý View
//         Log.d("IminViceScreen", "Initializing ReactRootView with moduleName: $moduleName")
//         val rView = ReactRootView(context)
//         this.rootView = rView
        
//         // Cần setContentView TRƯỚC KHI startReactApplication để tránh lỗi JNI trên một số thiết bị
//         Log.d("IminViceScreen", "Calling setContentView")
//         setContentView(rView)
        
//         // Khởi chạy component từ JS
//         Log.d("IminViceScreen", "Starting React Application")
//         rView.startReactApplication(reactInstanceManager, moduleName, null)
//         Log.d("IminViceScreen", "IminViceScreenPresentation onCreate finished")
//     }

//     // 4. QUẢN LÝ VÒNG ĐỜI: Quan trọng để không bị tràn RAM dẫn đến crash
//     override fun onStop() {
//         rootView?.unmountReactApplication()
//         rootView = null
//         super.onStop()
//     }

//     override fun dismiss() {
//         rootView?.unmountReactApplication()
//         super.dismiss()
//     }
// }


//------------------------ v3 --------------------------------
// package expo.modules.iminvicescreen

// import android.app.Presentation
// import android.content.Context
// import android.os.Bundle
// import android.os.Handler
// import android.os.Looper
// import android.view.Display
// import android.view.WindowManager
// import android.util.Log
// import com.facebook.react.ReactApplication
// import com.facebook.react.ReactInstanceManager
// import com.facebook.react.ReactRootView
// import com.facebook.react.bridge.ReactContext

// class IminViceScreenPresentation(
//     appContext: Context,
//     display: Display,
//     private val moduleName: String
// ) : Presentation(appContext, display) {

//     private var rootView: ReactRootView? = null

//     override fun onCreate(savedInstanceState: Bundle?) {
//         Log.d("IminViceScreen", "onCreate: started")
//         super.onCreate(savedInstanceState)

//         // ✅ FIX 1: API 33+ — KHÔNG gọi setType, window type 2037 là đúng của Presentation
//         // Chỉ set type cho API < 32 (giống Java demo)
//         window?.let { win ->
//             when {
//                 android.os.Build.VERSION.SDK_INT >= 32 -> {
//                     // Không làm gì - type 2037 (TYPE_APPLICATION) là mặc định đúng cho API 32+
//                     Log.d("IminViceScreen", "API >= 32: keeping default type ${win.attributes.type}")
//                 }
//                 android.os.Build.VERSION.SDK_INT >= 26 -> {
//                     win.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY) // 2038
//                     Log.d("IminViceScreen", "API 26-31: TYPE_APPLICATION_OVERLAY")
//                 }
//                 else -> {
//                     @Suppress("DEPRECATION")
//                     win.setType(WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY)
//                     Log.d("IminViceScreen", "API < 26: TYPE_SYSTEM_OVERLAY")
//                 }
//             }
//             win.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
//         } ?: Log.e("IminViceScreen", "Window is null!")

//         // ✅ FIX 2: Dùng context của Presentation (đã được cấu hình cho màn phụ)
//         // KHÔNG dùng applicationContext hay reactContext từ ngoài vào
//         val reactApplication = context.applicationContext as? ReactApplication
//             ?: throw Exception("applicationContext must implement ReactApplication")

//         val reactInstanceManager = reactApplication.reactNativeHost.reactInstanceManager

//         Log.d("IminViceScreen", "ReactInstanceManager ready: ${reactInstanceManager.hasStartedCreatingInitialContext()}")

//         // Dùng context của Presentation - đây là context đã bind với display phụ
//         val rView = ReactRootView(context)
//         rootView = rView
//         setContentView(rView)

//         // ✅ FIX 3: Đợi ReactInstanceManager sẵn sàng rồi mới startReactApplication
//         startReactWhenReady(rView, reactInstanceManager)

//         Log.d("IminViceScreen", "onCreate: finished, module=$moduleName")
//     }

//     private fun startReactWhenReady(
//         rView: ReactRootView,
//         reactInstanceManager: ReactInstanceManager
//     ) {
//         if (reactInstanceManager.hasStartedCreatingInitialContext()) {
//             // Bridge đã sẵn sàng → chạy ngay
//             Log.d("IminViceScreen", "Bridge ready, starting React app immediately")
//             rView.startReactApplication(reactInstanceManager, moduleName, null)
//         } else {
//             // Bridge chưa sẵn sàng → đăng ký listener để chờ
//             Log.d("IminViceScreen", "Bridge not ready, waiting for context initialization...")
//             reactInstanceManager.addReactInstanceEventListener(
//                 object : ReactInstanceManager.ReactInstanceEventListener {
//                     override fun onReactContextInitialized(reactContext: ReactContext) {
//                         Log.d("IminViceScreen", "React context initialized, starting app now")
//                         Handler(Looper.getMainLooper()).post {
//                             // Kiểm tra view vẫn còn tồn tại trước khi start
//                             if (rootView != null) {
//                                 rView.startReactApplication(reactInstanceManager, moduleName, null)
//                             }
//                         }
//                         reactInstanceManager.removeReactInstanceEventListener(this)
//                     }
//                 }
//             )
//         }
//     }

//     override fun dismiss() {
//         Log.d("IminViceScreen", "dismiss called")
//         try {
//             rootView?.unmountReactApplication()
//         } catch (e: Exception) {
//             Log.e("IminViceScreen", "Error unmounting: ${e.message}")
//         }
//         rootView = null
//         super.dismiss()
//     }
// }


/// --------------- v 4 -------------------
// package expo.modules.iminvicescreen

// import android.app.Presentation
// import android.content.Context
// import android.os.Bundle
// import android.view.Display
// import android.view.WindowManager
// import android.util.Log
// import com.facebook.react.ReactApplication
// import com.facebook.react.bridge.ReactContext
// import com.facebook.react.interfaces.fabric.ReactSurface

// class IminViceScreenPresentation(
//     appContext: Context,
//     display: Display,
//     private val moduleName: String
// ) : Presentation(appContext, display) {

//     private var reactSurface: ReactSurface? = null

//     override fun onCreate(savedInstanceState: Bundle?) {
//         Log.d("IminViceScreen", "onCreate: started, API=${android.os.Build.VERSION.SDK_INT}")
//         super.onCreate(savedInstanceState)

//         // Window config — giống Java demo
//         window?.let { win ->
//             when {
//                 android.os.Build.VERSION.SDK_INT >= 32 -> {
//                     Log.d("IminViceScreen", "API >= 32: keep default type")
//                 }
//                 android.os.Build.VERSION.SDK_INT >= 26 -> {
//                     win.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY)
//                 }
//                 else -> {
//                     @Suppress("DEPRECATION")
//                     win.setType(WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY)
//                 }
//             }
//             // Quan trọng: không chiếm focus → tránh trigger onWindowFocusChange của React
//             win.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
//             win.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
//         }

//         val reactApplication = context.applicationContext as? ReactApplication
//             ?: throw Exception("applicationContext must implement ReactApplication")

//         // ✅ New Architecture: dùng reactHost thay vì reactNativeHost
//         val reactHost = reactApplication.reactHost
//             ?: throw Exception("ReactHost is null — ensure New Architecture is enabled")

//         Log.d("IminViceScreen", "ReactHost obtained: ${reactHost.javaClass.simpleName}")

//         // ✅ ReactSurface là API đúng cho New Architecture
//         val surface = ReactSurface.createWithView(context, moduleName, null)
//         reactSurface = surface

//         Log.d("IminViceScreen", "ReactSurface created, attaching to host...")
//         surface.attach(reactHost)
//         surface.start()

//         val surfaceView = surface.view
//             ?: throw Exception("ReactSurface.view is null after start()")

//         setContentView(surfaceView)
//         Log.d("IminViceScreen", "onCreate: finished")
//     }

//     override fun dismiss() {
//         Log.d("IminViceScreen", "dismiss called")
//         try {
//             reactSurface?.stop()
//             reactSurface?.detach()
//         } catch (e: Exception) {
//             Log.e("IminViceScreen", "Error stopping surface: ${e.message}")
//         }
//         reactSurface = null
//         super.dismiss()
//     }
// }












package expo.modules.iminvicescreen

import android.app.Presentation
import android.content.Context
import android.os.Bundle
import android.view.Display
import android.view.WindowManager
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.interfaces.fabric.ReactSurface

class IminViceScreenPresentation(
    appContext: Context,
    display: Display,
    private val moduleName: String
) : Presentation(appContext, display) {

    private var reactSurface: ReactSurface? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d("IminViceScreen", "onCreate: API=${android.os.Build.VERSION.SDK_INT}")
        super.onCreate(savedInstanceState)

        // Window config — giống Java demo, không setType cho API >= 32
        window?.let { win ->
            when {
                android.os.Build.VERSION.SDK_INT >= 32 -> {
                    Log.d("IminViceScreen", "API >= 32: keep default type")
                }
                android.os.Build.VERSION.SDK_INT >= 26 -> {
                    win.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY)
                }
                else -> {
                    @Suppress("DEPRECATION")
                    win.setType(WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY)
                }
            }
            // FLAG_NOT_FOCUSABLE: ngăn Presentation trigger onWindowFocusChange
            // → fix lỗi "Tried to access onWindowFocusChange while context is not ready"
            win.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
            win.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
        } ?: Log.e("IminViceScreen", "Window is null!")

        val reactApplication = context.applicationContext as? ReactApplication
            ?: throw Exception("applicationContext must implement ReactApplication")

        // ✅ New Architecture: dùng reactHost (KHÔNG dùng reactNativeHost)
        val reactHost = reactApplication.reactHost
            ?: throw Exception("ReactHost is null — New Architecture không khởi động được")

        Log.d("IminViceScreen", "ReactHost: ${reactHost.javaClass.simpleName}")

        // ✅ API đúng cho New Arch: reactHost.createSurface()
        // (KHÔNG dùng ReactSurface.createWithView — đó là internal impl)
        val surface = reactHost.createSurface(context, moduleName, null)
        reactSurface = surface

        // start() → khởi tạo view bên trong surface
        surface.start()

        val surfaceView = surface.view
        if (surfaceView != null) {
            Log.d("IminViceScreen", "Surface view ready, setting content view")
            setContentView(surfaceView)
        } else {
            Log.e("IminViceScreen", "Surface view is null after start()!")
        }

        Log.d("IminViceScreen", "onCreate: finished")
    }

    override fun dismiss() {
        Log.d("IminViceScreen", "dismiss called")
        try {
            reactSurface?.stop()
        } catch (e: Exception) {
            Log.e("IminViceScreen", "Error stopping surface: ${e.message}")
        }
        reactSurface = null
        super.dismiss()
    }
}