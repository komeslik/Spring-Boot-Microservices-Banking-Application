package org.training.transactions.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.training.transactions.model.dto.TransactionDto;
import org.training.transactions.model.response.Response;
import org.training.transactions.model.response.TransactionRequest;
import org.training.transactions.service.TransactionService;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionControllerFeatureFlagTest {

    @Mock
    private TransactionService transactionService;

    @InjectMocks
    private TransactionController transactionController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(transactionController, "transactionCreateEnabled", true);
        ReflectionTestUtils.setField(transactionController, "transactionReadEnabled", true);
    }

    // --- Transaction create flag tests ---

    @Test
    void addTransactions_whenEnabled_shouldCallService() {
        TransactionDto dto = new TransactionDto();
        Response response = Response.builder().message("Transaction added").build();
        when(transactionService.addTransaction(any(TransactionDto.class))).thenReturn(response);

        ResponseEntity<?> result = transactionController.addTransactions(dto);

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        verify(transactionService).addTransaction(any(TransactionDto.class));
    }

    @Test
    void addTransactions_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(transactionController, "transactionCreateEnabled", false);

        ResponseEntity<?> result = transactionController.addTransactions(new TransactionDto());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Transaction creation is currently disabled", result.getBody());
        verifyNoInteractions(transactionService);
    }

    // --- Transaction read flag tests ---

    @Test
    void getTransactions_whenEnabled_shouldCallService() {
        List<TransactionRequest> transactions = Collections.emptyList();
        when(transactionService.getTransaction(anyString())).thenReturn(transactions);

        ResponseEntity<?> result = transactionController.getTransactions("0600140000001");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(transactionService).getTransaction("0600140000001");
    }

    @Test
    void getTransactions_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(transactionController, "transactionReadEnabled", false);

        ResponseEntity<?> result = transactionController.getTransactions("0600140000001");

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Transaction read is currently disabled", result.getBody());
        verifyNoInteractions(transactionService);
    }
}
