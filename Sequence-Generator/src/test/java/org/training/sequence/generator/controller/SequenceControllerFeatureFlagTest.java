package org.training.sequence.generator.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.training.sequence.generator.model.entity.Sequence;
import org.training.sequence.generator.service.SequenceService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SequenceControllerFeatureFlagTest {

    @Mock
    private SequenceService sequenceService;

    @InjectMocks
    private SequenceController sequenceController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sequenceController, "sequenceGenerationEnabled", true);
    }

    @Test
    void generateAccountNumber_whenEnabled_shouldCallService() {
        Sequence sequence = Sequence.builder().sequenceId(1L).accountNumber(1L).build();
        when(sequenceService.create()).thenReturn(sequence);

        ResponseEntity<?> result = sequenceController.generateAccountNumber();

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(sequence, result.getBody());
        verify(sequenceService).create();
    }

    @Test
    void generateAccountNumber_whenDisabled_shouldReturn503() {
        ReflectionTestUtils.setField(sequenceController, "sequenceGenerationEnabled", false);

        ResponseEntity<?> result = sequenceController.generateAccountNumber();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, result.getStatusCode());
        assertEquals("Sequence generation is currently disabled", result.getBody());
        verifyNoInteractions(sequenceService);
    }
}
