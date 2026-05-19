package kotlinx.coroutines.scheduling

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlin.coroutines.CoroutineContext

open class ExperimentalCoroutineDispatcher(
    private val corePoolSize: Int,
    private val maxPoolSize: Int,
    private val keepAliveTimeNs: Long,
    private val schedulerName: String = "DefaultScheduler"
) : CoroutineDispatcher() {

    constructor(
        corePoolSize: Int = 0,
        maxPoolSize: Int = 0,
        schedulerName: String = "DefaultScheduler"
    ) : this(corePoolSize, maxPoolSize, 60L * 1000L * 1000L * 1000L, schedulerName)

    override fun dispatch(context: CoroutineContext, block: Runnable) {
        // Ủy quyền xử lý bất đồng bộ thực sự cho Dispatchers.IO để tránh Deadlock luồng
        Dispatchers.IO.dispatch(context, block)
    }

    // Trả về Dispatchers.IO thực thụ cho các tác vụ blocking I/O của Ingenico SDK
    fun blocking(parallelism: Int): CoroutineDispatcher {
        return Dispatchers.IO
    }
}
