package org.training.account.service.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.training.account.service.model.dto.AccountDto;
import org.training.account.service.model.dto.AccountStatusUpdate;
import org.training.account.service.model.dto.response.Response;
import org.training.account.service.service.AccountService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountControllerFeatureFlagTest {

    @Mock
    private AccountService accountService;

    @InjectMocks
    private AccountController accountController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(accountController, "accountCreationEnabled", true);
        ReflectionTestUtils.setField(accountController, "accountReadEnabled", true);
        ReflectionTestUtils.setField(accountController, "accountUpdateStatusEnabled", true);
    }

    // --- Account creation flag tests ---

    @Test
    void createAccount_whenEnabled_shouldCallService() {
        AccountDto accountDto = new AccountDto();
        Response response = Response.builder().message("Account created").build();
        when(accountService.createAccount(any(AccountDto.class))).thenReturn(response);

        ResponseEntity<?> result = accountController.createAccount(accountDto);

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        verify(accountService).createAccount(any(AccountDto.class));
    }

    @Test
    void createAccount_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(accountController, "accountCreationEnabled", false);

        ResponseEntity<?> result = accountController.createAccount(new AccountDto());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Account creation is currently disabled", result.getBody());
        verifyNoInteractions(accountService);
    }

    // --- Account read flag tests ---

    @Test
    void readByAccountNumber_whenEnabled_shouldCallService() {
        AccountDto accountDto = AccountDto.builder().accountNumber("0600140000001").build();
        when(accountService.readAccountByAccountNumber(anyString())).thenReturn(accountDto);

        ResponseEntity<?> result = accountController.readByAccountNumber("0600140000001");

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(accountService).readAccountByAccountNumber("0600140000001");
    }

    @Test
    void readByAccountNumber_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(accountController, "accountReadEnabled", false);

        ResponseEntity<?> result = accountController.readByAccountNumber("0600140000001");

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Account read is currently disabled", result.getBody());
        verifyNoInteractions(accountService);
    }

    // --- Account status update flag tests ---

    @Test
    void updateAccountStatus_whenEnabled_shouldCallService() {
        AccountStatusUpdate statusUpdate = new AccountStatusUpdate();
        Response response = Response.builder().message("Updated").build();
        when(accountService.updateStatus(anyString(), any(AccountStatusUpdate.class))).thenReturn(response);

        ResponseEntity<?> result = accountController.updateAccountStatus("0600140000001", statusUpdate);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(accountService).updateStatus(anyString(), any(AccountStatusUpdate.class));
    }

    @Test
    void updateAccountStatus_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(accountController, "accountUpdateStatusEnabled", false);

        ResponseEntity<?> result = accountController.updateAccountStatus("0600140000001", new AccountStatusUpdate());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Account status update is currently disabled", result.getBody());
        verifyNoInteractions(accountService);
    }
}
