package org.training.fundtransfer.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.training.fundtransfer.model.dto.request.FundTransferRequest;
import org.training.fundtransfer.model.dto.response.FundTransferResponse;
import org.training.fundtransfer.service.FundTransferService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FundTransferControllerFeatureFlagTest {

    @Mock
    private FundTransferService fundTransferService;

    @InjectMocks
    private FundTransferController fundTransferController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(fundTransferController, "fundTransferEnabled", true);
    }

    @Test
    void fundTransfer_whenEnabled_shouldCallService() {
        FundTransferRequest request = new FundTransferRequest();
        FundTransferResponse response = FundTransferResponse.builder().message("Transfer successful").build();
        when(fundTransferService.fundTransfer(any(FundTransferRequest.class))).thenReturn(response);

        ResponseEntity<?> result = fundTransferController.fundTransfer(request);

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        verify(fundTransferService).fundTransfer(any(FundTransferRequest.class));
    }

    @Test
    void fundTransfer_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(fundTransferController, "fundTransferEnabled", false);

        ResponseEntity<?> result = fundTransferController.fundTransfer(new FundTransferRequest());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Fund transfer feature is currently disabled", result.getBody());
        verifyNoInteractions(fundTransferService);
    }
}
