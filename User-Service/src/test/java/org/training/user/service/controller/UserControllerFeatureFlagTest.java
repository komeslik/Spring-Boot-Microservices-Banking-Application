package org.training.user.service.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.training.user.service.model.dto.CreateUser;
import org.training.user.service.model.dto.UserDto;
import org.training.user.service.model.dto.UserUpdate;
import org.training.user.service.model.dto.UserUpdateStatus;
import org.training.user.service.model.dto.response.Response;
import org.training.user.service.service.UserService;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerFeatureFlagTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        // Enable all flags by default
        ReflectionTestUtils.setField(userController, "userRegistrationEnabled", true);
        ReflectionTestUtils.setField(userController, "userReadEnabled", true);
        ReflectionTestUtils.setField(userController, "userUpdateProfileEnabled", true);
        ReflectionTestUtils.setField(userController, "userUpdateStatusEnabled", true);
    }

    // --- Registration flag tests ---

    @Test
    void createUser_whenEnabled_shouldCallService() {
        CreateUser createUser = new CreateUser();
        Response response = Response.builder().responseMessage("User created successfully").build();
        when(userService.createUser(any(CreateUser.class))).thenReturn(response);

        ResponseEntity<?> result = userController.createUser(createUser);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userService).createUser(any(CreateUser.class));
    }

    @Test
    void createUser_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(userController, "userRegistrationEnabled", false);

        ResponseEntity<?> result = userController.createUser(new CreateUser());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("User registration is currently disabled", result.getBody());
        verifyNoInteractions(userService);
    }

    // --- Read flag tests ---

    @Test
    void readAllUsers_whenEnabled_shouldCallService() {
        List<UserDto> users = Collections.emptyList();
        when(userService.readAllUsers()).thenReturn(users);

        ResponseEntity<?> result = userController.readAllUsers();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userService).readAllUsers();
    }

    @Test
    void readAllUsers_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(userController, "userReadEnabled", false);

        ResponseEntity<?> result = userController.readAllUsers();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("User read is currently disabled", result.getBody());
        verifyNoInteractions(userService);
    }

    // --- Update profile flag tests ---

    @Test
    void updateUser_whenEnabled_shouldCallService() {
        UserUpdate userUpdate = new UserUpdate();
        Response response = Response.builder().responseMessage("Updated").build();
        when(userService.updateUser(anyLong(), any(UserUpdate.class))).thenReturn(response);

        ResponseEntity<?> result = userController.updateUser(1L, userUpdate);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userService).updateUser(anyLong(), any(UserUpdate.class));
    }

    @Test
    void updateUser_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(userController, "userUpdateProfileEnabled", false);

        ResponseEntity<?> result = userController.updateUser(1L, new UserUpdate());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("User profile update is currently disabled", result.getBody());
        verifyNoInteractions(userService);
    }

    // --- Update status flag tests ---

    @Test
    void updateUserStatus_whenEnabled_shouldCallService() {
        UserUpdateStatus statusUpdate = new UserUpdateStatus();
        Response response = Response.builder().responseMessage("Updated").build();
        when(userService.updateUserStatus(anyLong(), any(UserUpdateStatus.class))).thenReturn(response);

        ResponseEntity<?> result = userController.updateUserStatus(1L, statusUpdate);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(userService).updateUserStatus(anyLong(), any(UserUpdateStatus.class));
    }

    @Test
    void updateUserStatus_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(userController, "userUpdateStatusEnabled", false);

        ResponseEntity<?> result = userController.updateUserStatus(1L, new UserUpdateStatus());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("User status update is currently disabled", result.getBody());
        verifyNoInteractions(userService);
    }
}
