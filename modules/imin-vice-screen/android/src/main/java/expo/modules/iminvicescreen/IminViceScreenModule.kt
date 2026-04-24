package expo.modules.iminvicescreen

import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.provider.Settings
import android.view.Display
import android.view.WindowManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class IminViceScreenModule : Module() {
  private var presentation: IminViceScreenPresentation? = null

  override fun definition() = ModuleDefinition {
    Name("IminViceScreen")

    // Sự kiện để màn hình khách lắng nghe dữ liệu
    Events("onDataReceived")

    // Kiểm tra máy có hỗ trợ màn hình phụ không
    Function("isSupportDoubleScreen") {
      val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
      val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
      displays.isNotEmpty()
    }

    // Kiểm tra quyền Overlay (vẽ lên màn hình khác)
    Function("checkOverlayPermission") {
      if (android.os.Build.VERSION.SDK_INT >= 23) {
        Settings.canDrawOverlays(context)
      } else true
    }

    // Yêu cầu quyền Overlay
    Function("requestOverlayPermission") {
      if (android.os.Build.VERSION.SDK_INT >= 23) {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:${context.packageName}"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    // Mở màn hình phụ
    // AsyncFunction("open") { moduleName: String ->
    //   Log.d("IminViceScreen", "AsyncFunction open called with moduleName: $moduleName")
    //   Log.d("IminViceScreen", "SDK_INT: ${android.os.Build.VERSION.SDK_INT}")

    //   // Chỉ kiểm tra quyền overlay cho các bản Android từ M đến dưới S_V2 (giống code Java)
    //   if (android.os.Build.VERSION.SDK_INT >= 23 && android.os.Build.VERSION.SDK_INT < 32) {
    //     val canDraw = Settings.canDrawOverlays(context)
    //     Log.d("IminViceScreen", "Overlay permission status: $canDraw")
    //     if (!canDraw) {
    //       throw Exception("Overlay permission not granted. Please call requestOverlayPermission() first.")
    //     }
    //   }

    //   val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
    //   val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
    //   Log.d("IminViceScreen", "Found ${displays.size} presentation displays")

    //   // Tìm màn hình phù hợp như code Java (FLAG_SECURE & FLAG_PRESENTATION)
    //   val display = displays.find { 
    //     val flags = it.flags
    //     val isSecure = (flags and Display.FLAG_SECURE) != 0
    //     val isPresentation = (flags and Display.FLAG_PRESENTATION) != 0
    //     Log.d("IminViceScreen", "Display ID: ${it.displayId}, Flags: $flags, isSecure: $isSecure, isPresentation: $isPresentation")
    //     isSecure && isPresentation
    //   } ?: displays.firstOrNull()

    //   if (display != null) {
    //     Log.d("IminViceScreen", "Target Display selected: ${display.displayId}")
    //     if (presentation != null) {
    //       Log.d("IminViceScreen", "Dismissing existing presentation")
    //       presentation?.dismiss()
    //     }
        
    //     // Dùng thẳng ApplicationContext như code Java
    //     val contextToUse = context.applicationContext
    //     Log.d("IminViceScreen", "Context contextToUse: ${contextToUse.javaClass.name}")

    //     presentation = IminViceScreenPresentation(contextToUse, display, moduleName)
    //     Log.d("IminViceScreen", "Showing presentation...")
    //     presentation?.show()
    //   } else {
    //     Log.e("IminViceScreen", "No suitable secondary display found!")
    //   }
    // }.runOnQueue(Queues.MAIN)
    AsyncFunction("open") { moduleName: String ->
    Log.d("IminViceScreen", "open: moduleName=$moduleName")

    if (android.os.Build.VERSION.SDK_INT >= 23 && android.os.Build.VERSION.SDK_INT < 32) {
        if (!Settings.canDrawOverlays(context)) {
            throw Exception("Overlay permission not granted. Call requestOverlayPermission() first.")
        }
    }

    val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
    val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
    Log.d("IminViceScreen", "Found ${displays.size} presentation display(s)")

    val display = displays.find { d ->
        val flags = d.flags
        (flags and Display.FLAG_SECURE) != 0 && (flags and Display.FLAG_PRESENTATION) != 0
    } ?: displays.firstOrNull()

    if (display == null) {
        Log.e("IminViceScreen", "No secondary display found!")
        return@AsyncFunction
    }

    presentation?.dismiss()
    presentation = null

    Log.d("IminViceScreen", "Using display: ${display.displayId}")

    presentation = IminViceScreenPresentation(
        context.applicationContext,   // ← cho Presentation (tồn tại ngoài Activity)
        display,
        moduleName
    )
    presentation?.show()
    Log.d("IminViceScreen", "Presentation shown")
}.runOnQueue(Queues.MAIN)

    // Đóng màn hình phụ
    AsyncFunction("close") {
      Log.d("IminViceScreen", "AsyncFunction close called")
      presentation?.dismiss()
      presentation = null
    }.runOnQueue(Queues.MAIN)

    // Gửi tin nhắn từ Main sang Sub
    Function("sendMsgToViceScreen") { method: String, params: Map<String, Any> ->
      sendEvent("onDataReceived", mapOf(
        "method" to method,
        "params" to params
      ))
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exception("React Context not found")
}