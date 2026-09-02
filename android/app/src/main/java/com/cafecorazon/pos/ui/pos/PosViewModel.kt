package com.cafecorazon.pos.ui.pos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.entity.MenuItemEntity
import com.cafecorazon.pos.data.local.entity.PromoEntity
import com.cafecorazon.pos.data.repository.MenuRepository
import com.cafecorazon.pos.data.repository.OrderCartItemInput
import com.cafecorazon.pos.data.repository.OrderRepository
import com.cafecorazon.pos.data.repository.PromoRepository
import com.cafecorazon.pos.data.repository.SettingsRepository
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CartItem(
    val id: String, // UUID/timestamp
    val menuItem: MenuItemEntity,
    val quantity: Int = 1,
    val size: String = "Medium",
    val sugar: String = "100%",
    val milk: String = "Whole Milk",
    val addons: List<String> = emptyList(),
    val notes: String = "",
    val unitPrice: Double
)

data class PosUiState(
    val selectedCategory: String = "All",
    val searchQuery: String = "",
    val menuItems: List<MenuItemEntity> = emptyList(),
    val categories: List<String> = emptyList(),
    val cartItems: List<CartItem> = emptyList(),
    val selectedDiscountType: String = "None", // "None", "Senior", "PWD"
    val discountIdNumber: String = "",
    val discountBeneficiary: String = "",
    val selectedPromo: PromoEntity? = null,
    val availablePromos: List<PromoEntity> = emptyList(),
    val customerName: String = "",
    val tinNumber: String = "",
    val customerAddress: String = "",
    val orderType: String = "Dine in", // "Dine in", "Takeout", "Pick up"
    val cashGiven: Double = 0.0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val createdOrderId: Long? = null
)

class PosViewModel(
    private val menuRepository: MenuRepository,
    private val orderRepository: OrderRepository,
    private val promoRepository: PromoRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PosUiState())
    val uiState: StateFlow<PosUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            menuRepository.menuItemsFlow.collect { items ->
                _uiState.value = _uiState.value.copy(menuItems = items)
            }
        }
        viewModelScope.launch {
            menuRepository.categoriesFlow.collect { cats ->
                val fullList = listOf("All") + cats
                _uiState.value = _uiState.value.copy(categories = fullList)
            }
        }
        viewModelScope.launch {
            promoRepository.promosFlow.collect { list ->
                val activeList = list.map { it.promo }.filter { it.status == "Active" }
                _uiState.value = _uiState.value.copy(availablePromos = activeList)
            }
        }
    }

    fun selectCategory(cat: String) {
        _uiState.value = _uiState.value.copy(selectedCategory = cat)
    }

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    fun addToCart(item: MenuItemEntity) {
        val currentCart = _uiState.value.cartItems.toMutableList()
        val existingIndex = currentCart.indexOfFirst { it.menuItem.id == item.id }
        if (existingIndex >= 0) {
            val existing = currentCart[existingIndex]
            currentCart[existingIndex] = existing.copy(quantity = existing.quantity + 1)
        } else {
            currentCart.add(
                CartItem(
                    id = java.util.UUID.randomUUID().toString(),
                    menuItem = item,
                    quantity = 1,
                    unitPrice = item.price
                )
            )
        }
        _uiState.value = _uiState.value.copy(cartItems = currentCart)
    }

    fun updateCartItemQty(cartItemId: String, delta: Int) {
        val currentCart = _uiState.value.cartItems.toMutableList()
        val index = currentCart.indexOfFirst { it.id == cartItemId }
        if (index >= 0) {
            val current = currentCart[index]
            val newQty = current.quantity + delta
            if (newQty <= 0) {
                currentCart.removeAt(index)
            } else {
                currentCart[index] = current.copy(quantity = newQty)
            }
            _uiState.value = _uiState.value.copy(cartItems = currentCart)
        }
    }

    fun clearCart() {
        _uiState.value = _uiState.value.copy(
            cartItems = emptyList(),
            selectedPromo = null,
            selectedDiscountType = "None",
            discountIdNumber = "",
            customerName = "",
            tinNumber = "",
            customerAddress = "",
            cashGiven = 0.0,
            createdOrderId = null
        )
    }

    fun getSubtotal(): Double {
        return _uiState.value.cartItems.sumOf { it.unitPrice * it.quantity }
    }

    fun getDiscountAmount(): Double {
        val subtotal = getSubtotal()
        val type = _uiState.value.selectedDiscountType
        if (type == "Senior" || type == "PWD") {
            return subtotal * 0.20 // 20% discount
        }
        return 0.0
    }

    fun getPromoDiscountAmount(): Double {
        val subtotal = getSubtotal()
        val promo = _uiState.value.selectedPromo ?: return 0.0
        return if (promo.discountType == "percentage") {
            subtotal * (promo.discountValue / 100.0)
        } else {
            promo.discountValue
        }
    }

    fun getTotalAmount(): Double {
        val subtotal = getSubtotal()
        val disc = getDiscountAmount()
        val promoDisc = getPromoDiscountAmount()
        return maxOf(0.0, subtotal - disc - promoDisc)
    }

    fun getChangeAmount(): Double {
        val total = getTotalAmount()
        val cash = _uiState.value.cashGiven
        return maxOf(0.0, cash - total)
    }

    fun setDiscountType(type: String, idNum: String = "") {
        _uiState.value = _uiState.value.copy(selectedDiscountType = type, discountIdNumber = idNum)
    }

    fun setPromo(promo: PromoEntity?) {
        _uiState.value = _uiState.value.copy(selectedPromo = promo)
    }

    fun setCustomerName(name: String) {
        _uiState.value = _uiState.value.copy(customerName = name)
    }

    fun setTinNumber(tin: String) {
        _uiState.value = _uiState.value.copy(tinNumber = tin)
    }

    fun setCustomerAddress(address: String) {
        _uiState.value = _uiState.value.copy(customerAddress = address)
    }

    fun setCashGiven(cash: Double) {
        _uiState.value = _uiState.value.copy(cashGiven = cash)
    }

    fun checkout(sessionUser: SessionUser?, onSuccess: (Long) -> Unit) {
        val state = _uiState.value
        if (state.cartItems.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Cart is empty")
            return
        }

        val total = getTotalAmount()
        if (state.cashGiven < total) {
            _uiState.value = _uiState.value.copy(errorMessage = "Cash given is less than total amount")
            return
        }

        val cartInputs = state.cartItems.map { c ->
            OrderCartItemInput(
                menuItemId = c.menuItem.id,
                quantity = c.quantity,
                price = c.unitPrice
            )
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val res = orderRepository.createOrder(
                customerName = if (state.customerName.isBlank()) "Walk-in" else state.customerName,
                totalAmount = total,
                paymentMethod = "Cash",
                orderStatus = "completed",
                items = cartInputs,
                promoId = state.selectedPromo?.id,
                promoName = state.selectedPromo?.promoName,
                promoDiscountAmount = getPromoDiscountAmount(),
                actorUserId = sessionUser?.id,
                actorUserName = sessionUser?.fullname
            )

            if (res.isSuccess) {
                val orderId = res.getOrNull()!!
                _uiState.value = _uiState.value.copy(isLoading = false, createdOrderId = orderId)
                onSuccess(orderId)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = res.exceptionOrNull()?.message ?: "Checkout failed"
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    class Factory(
        private val menuRepository: MenuRepository,
        private val orderRepository: OrderRepository,
        private val promoRepository: PromoRepository,
        private val settingsRepository: SettingsRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return PosViewModel(menuRepository, orderRepository, promoRepository, settingsRepository) as T
        }
    }
}
