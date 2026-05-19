package expo.modules.paymentportable

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.coroutines.runBlocking
import com.ingenico.vn.EcrClient
import android.util.Log

class PaymentPortableModule : Module() {
  private lateinit var ecrClient: EcrClient

  override fun definition() = ModuleDefinition {
    Name("PaymentPortable")

    AsyncFunction("doConnect") { posUrl: String, merchantName: String, cashierId: String, license: String ->
      Log.d("PaymentPortable", "=== doConnect START ===")
      Log.d("PaymentPortable", "posUrl: $posUrl")
      Log.d("PaymentPortable", "merchantName: $merchantName")
      Log.d("PaymentPortable", "cashierId: $cashierId")
      
      try {
        val ecrClientInfo = buildJsonObject {
          put("merchantName", merchantName)
          put("cashierId", cashierId)
          put("licenseFor$merchantName", license)
        }
        val infoString = ecrClientInfo.toString()
        Log.d("PaymentPortable", "ecrClientInfo JSON: $infoString")

        Log.d("PaymentPortable", "Initializing EcrClient...")
        ecrClient = EcrClient(posUrl, infoString)
        
        Log.d("PaymentPortable", "Connecting to POS socket in runBlocking...")
        val connectResult = runBlocking {
          ecrClient.connect(infoString)
        }
        Log.d("PaymentPortable", "=== doConnect SUCCESS: $connectResult ===")
        connectResult
      } catch (e: Exception) {
        Log.e("PaymentPortable", "=== doConnect FAILED with exception ===", e)
        throw e
      }
    }

    AsyncFunction("doCommand") { command: String ->
      Log.d("PaymentPortable", "=== doCommand START ===")
      Log.d("PaymentPortable", "command payload: $command")
      
      try {
        val isInitialized = ::ecrClient.isInitialized
        val isConnected = if (isInitialized) ecrClient.connected() else false
        Log.d("PaymentPortable", "Connection State - Initialized: $isInitialized, Connected: $isConnected")

        if (isInitialized && isConnected) {
          Log.d("PaymentPortable", "Executing command in runBlocking...")
          val response = runBlocking {
            ecrClient.execute(command)
          }
          Log.d("PaymentPortable", "=== doCommand SUCCESS, response: $response ===")
          response
        } else {
          val errMsg = "POS is not connected (initialized=$isInitialized, connected=$isConnected)"
          Log.w("PaymentPortable", "=== doCommand ABORTED: $errMsg ===")
          throw Exception(errMsg)
        }
      } catch (e: Exception) {
        Log.e("PaymentPortable", "=== doCommand FAILED with exception ===", e)
        throw e
      }
    }
  }
}
