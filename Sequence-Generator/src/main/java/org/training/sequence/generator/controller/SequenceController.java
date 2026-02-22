package org.training.sequence.generator.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.training.sequence.generator.model.entity.Sequence;
import org.training.sequence.generator.service.SequenceService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/sequence")
public class SequenceController {

    private final SequenceService sequenceService;

    @Value("${feature.sequence-generation.enabled:true}")
    private boolean sequenceGenerationEnabled;

    /**
     * Generates an account number.
     *
     * @return The generated account number.
     */
    @PostMapping
    public ResponseEntity<?> generateAccountNumber() {
        if (!sequenceGenerationEnabled) {
            return new ResponseEntity<>("Sequence generation is currently disabled", HttpStatus.SERVICE_UNAVAILABLE);
        }
        return ResponseEntity.ok(sequenceService.create());
    }
}
