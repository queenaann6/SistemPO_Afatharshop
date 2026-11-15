<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!config('app.key')) {
            config()->set('app.key', 'base64:' . base64_encode(str_repeat('k', 32)));
        }

        if (!config('jwt.secret')) {
            config()->set('jwt.secret', str_repeat('s', 64));
        }
    }
}
