<template>
  <div class="sw-input-group" :class="{ 'has-error': Boolean(error), 'is-disabled': disabled }">
    <label v-if="label" class="sw-label">
      {{ label }}
      <span v-if="required" class="required-star">*</span>
    </label>

    <div class="input-wrapper">
      <span v-if="$slots.prefix" class="prefix-slot">
        <slot name="prefix"></slot>
      </span>

      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="$emit('update:modelValue', $event.target.value)"
        class="sw-input"
        v-bind="$attrs"
      />

      <span v-if="$slots.suffix" class="suffix-slot">
        <slot name="suffix"></slot>
      </span>
    </div>

    <span v-if="error" class="error-msg">{{ error }}</span>
    <span v-else-if="hint" class="hint-msg">{{ hint }}</span>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  error: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.sw-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.sw-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--sw-text-secondary);
}

.required-star {
  color: var(--sw-accent);
  margin-left: 2px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.sw-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.sw-input:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
  box-shadow: 0 0 0 1px var(--sw-accent);
}

.sw-input::placeholder {
  color: var(--sw-text-muted);
}

.prefix-slot {
  position: absolute;
  left: 12px;
  color: var(--sw-text-muted);
  display: flex;
  align-items: center;
  pointer-events: none;
}

.suffix-slot {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
}

.has-error .sw-input {
  border-color: var(--sw-danger);
}

.has-error .sw-input:focus {
  border-color: var(--sw-danger);
  box-shadow: 0 0 0 1px var(--sw-danger);
}

.error-msg {
  font-size: 0.78rem;
  color: var(--sw-danger);
  margin-top: 2px;
}

.hint-msg {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
