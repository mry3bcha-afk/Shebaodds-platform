fun placeCasinoBet(wager: Double, payout: Double) {
    viewModelScope.launch {
        val current = wallet.value ?: return@launch
        val newBalance = (current.balance - wager + payout).coerceAtLeast(0.0)
        repository.updateWalletBalance(newBalance)   // your existing repo method
    }
}