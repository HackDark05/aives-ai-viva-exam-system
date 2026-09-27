package com.aives.knowledge;

import java.util.Locale;

final class VectorLiteral {

    private VectorLiteral() {
    }

    static String format(float[] values) {
        StringBuilder builder = new StringBuilder(values.length * 8 + 2);
        builder.append('[');
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(String.format(Locale.ROOT, "%.8f", values[index]));
        }
        builder.append(']');
        return builder.toString();
    }
}
