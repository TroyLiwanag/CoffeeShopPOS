package com.cafecorazon.pos.ui.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cafecorazon.pos.data.local.entity.ProductEntity
import com.cafecorazon.pos.data.repository.ProductRepository
import com.cafecorazon.pos.security.SessionUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ProductsUiState(
    val products: List<ProductEntity> = emptyList(),
    val categories: List<String> = emptyList(),
    val searchQuery: String = "",
    val selectedCategory: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class ProductsViewModel(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _selectedCategory = MutableStateFlow<String?>(null)
    private val _errorMessage = MutableStateFlow<String?>(null)
    private val _successMessage = MutableStateFlow<String?>(null)
    private val _isLoading = MutableStateFlow(false)

    private val _filterFlow = combine(_searchQuery, _selectedCategory) { s, c -> s to c }

    val uiState: StateFlow<ProductsUiState> = combine(
        productRepository.productsFlow,
        _filterFlow,
        _isLoading,
        _errorMessage,
        _successMessage
    ) { productsList, (search, category), loading, error, success ->
        val filtered = productsList.filter { p ->
            val matchesCategory = category == null || category == "All" || p.category.equals(category, ignoreCase = true)
            val matchesSearch = search.isBlank() || p.name.contains(search, ignoreCase = true) || (p.description?.contains(search, ignoreCase = true) == true)
            matchesCategory && matchesSearch
        }

        val cats = listOf("All") + productsList.mapNotNull { it.category }.distinct().sorted()

        ProductsUiState(
            products = filtered,
            categories = cats,
            searchQuery = search,
            selectedCategory = category,
            isLoading = loading,
            errorMessage = error,
            successMessage = success
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ProductsUiState()
    )

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSelectedCategory(cat: String?) {
        _selectedCategory.value = cat
    }

    fun clearMessages() {
        _errorMessage.value = null
        _successMessage.value = null
    }

    fun createProduct(product: ProductEntity, sessionUser: SessionUser?, onSuccess: () -> Unit) {
        if (product.name.isBlank()) {
            _errorMessage.value = "Product name is required"
            return
        }
        if (product.price <= 0) {
            _errorMessage.value = "Price must be greater than zero"
            return
        }
        if (product.stock < 0) {
            _errorMessage.value = "Stock cannot be negative"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            val res = productRepository.createProduct(product, sessionUser?.id, sessionUser?.fullname)
            _isLoading.value = false

            if (res.isSuccess) {
                _successMessage.value = "Product \"${product.name}\" created successfully!"
                onSuccess()
            } else {
                _errorMessage.value = res.exceptionOrNull()?.message ?: "Failed to create product"
            }
        }
    }

    fun updateProduct(product: ProductEntity, sessionUser: SessionUser?, onSuccess: () -> Unit) {
        if (product.name.isBlank()) {
            _errorMessage.value = "Product name is required"
            return
        }
        if (product.price <= 0) {
            _errorMessage.value = "Price must be greater than zero"
            return
        }
        if (product.stock < 0) {
            _errorMessage.value = "Stock cannot be negative"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            val res = productRepository.updateProduct(product, sessionUser?.id, sessionUser?.fullname)
            _isLoading.value = false

            if (res.isSuccess) {
                _successMessage.value = "Product \"${product.name}\" updated successfully!"
                onSuccess()
            } else {
                _errorMessage.value = res.exceptionOrNull()?.message ?: "Failed to update product"
            }
        }
    }

    fun toggleProductStatus(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            val res = productRepository.toggleProductStatus(id, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _successMessage.value = "Product status updated"
            } else {
                _errorMessage.value = res.exceptionOrNull()?.message ?: "Failed to update status"
            }
        }
    }

    fun deleteProduct(id: Long, sessionUser: SessionUser?) {
        viewModelScope.launch {
            val res = productRepository.deleteProduct(id, sessionUser?.id, sessionUser?.fullname)
            if (res.isSuccess) {
                _successMessage.value = "Product deleted successfully"
            } else {
                _errorMessage.value = res.exceptionOrNull()?.message ?: "Failed to delete product"
            }
        }
    }

    class Factory(private val productRepository: ProductRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return ProductsViewModel(productRepository) as T
        }
    }
}
